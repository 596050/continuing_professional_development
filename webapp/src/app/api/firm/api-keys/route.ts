/**
 * API Key Management - GET/POST/DELETE /api/firm/api-keys
 *
 * Allows firm admins to manage API keys for their firm.
 * - GET: List all keys (key values are never returned)
 * - POST: Create a new key (returns the raw key once)
 * - DELETE: Revoke a key by ID
 */
import { NextRequest, NextResponse } from "next/server";
import {
  requireRole,
  serverError,
  validationError,
  withRateLimit,
} from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generateApiKey, hashApiKey } from "@/lib/api-key-auth";
import { createApiKeySchema } from "@/lib/schemas";

// GET - List firm's API keys (without raw key values)
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

    const keys = await prisma.apiKey.findMany({
      where: { firmId: user.firmId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        revoked: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      keys: keys.map((k) => ({
        ...k,
        permissions: JSON.parse(k.permissions),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

// POST - Create a new API key
export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "api-keys-create", {
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
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { name, permissions } = parsed.data;

    // Generate the raw key
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = await prisma.apiKey.create({
      data: {
        firmId: user.firmId,
        name,
        keyHash,
        keyPrefix,
        permissions: JSON.stringify(permissions),
      },
    });

    // Return the raw key once - it cannot be retrieved later
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPrefix,
      permissions,
      createdAt: apiKey.createdAt.toISOString(),
      message: "Save this key securely. It will not be shown again.",
    });
  } catch (err) {
    return serverError(err);
  }
}

// DELETE - Revoke an API key
export async function DELETE(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "api-keys-revoke", {
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
    const keyId = body?.keyId;

    if (!keyId || typeof keyId !== "string") {
      return NextResponse.json(
        { error: "keyId is required", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // Verify the key belongs to this firm
    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, firmId: user.firmId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "API key not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true },
    });

    return NextResponse.json({
      success: true,
      message: "API key revoked",
    });
  } catch (err) {
    return serverError(err);
  }
}
