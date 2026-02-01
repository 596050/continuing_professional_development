/**
 * Webhook Management API - GET/POST/DELETE /api/firm/webhooks
 *
 * Allows firm admins to manage webhook endpoints for their firm.
 * - GET: List all webhook endpoints
 * - POST: Create a new webhook endpoint (URL must be HTTPS)
 * - DELETE: Remove a webhook endpoint by ID
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  requireRole,
  serverError,
  validationError,
  withRateLimit,
} from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createWebhookSchema } from "@/lib/schemas";

// GET - List firm's webhooks
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole("firm_admin", "admin");
    if (session instanceof NextResponse) return session;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json(
        { error: "No firm associated with account" },
        { status: 404 }
      );
    }

    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { firmId: user.firmId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        lastDelivery: true,
        failCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      webhooks: webhooks.map((w) => ({
        ...w,
        events: JSON.parse(w.events),
        lastDelivery: w.lastDelivery?.toISOString() ?? null,
        createdAt: w.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

// POST - Create a new webhook endpoint
export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "webhooks-create", {
      windowMs: 60_000,
      max: 10,
    });
    if (limited) return limited;

    const session = await requireRole("firm_admin", "admin");
    if (session instanceof NextResponse) return session;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json(
        { error: "No firm associated with account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { url, events } = parsed.data;

    // Generate a signing secret
    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        firmId: user.firmId,
        url,
        events: JSON.stringify(events),
        secret,
      },
    });

    return NextResponse.json({
      id: webhook.id,
      url: webhook.url,
      events,
      secret,
      active: webhook.active,
      createdAt: webhook.createdAt.toISOString(),
      message: "Save the webhook secret securely. It is used to verify webhook signatures.",
    });
  } catch (err) {
    return serverError(err);
  }
}

// DELETE - Remove a webhook endpoint
export async function DELETE(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "webhooks-delete", {
      windowMs: 60_000,
      max: 10,
    });
    if (limited) return limited;

    const session = await requireRole("firm_admin", "admin");
    if (session instanceof NextResponse) return session;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json(
        { error: "No firm associated with account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const webhookId = body?.webhookId;

    if (!webhookId || typeof webhookId !== "string") {
      return NextResponse.json(
        { error: "webhookId is required", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // Verify the webhook belongs to this firm
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id: webhookId, firmId: user.firmId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Webhook not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.webhookEndpoint.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({
      success: true,
      message: "Webhook endpoint deleted",
    });
  } catch (err) {
    return serverError(err);
  }
}
