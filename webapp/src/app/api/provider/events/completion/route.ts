import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST /api/provider/events/completion — provider sends a completion event
// Headers: X-Provider-Key, Idempotency-Key
// Body: { userEmail, activityTitle, hours, category?, completedAt, payload? }
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-provider-key");
    const idempotencyKey = req.headers.get("idempotency-key");

    if (!apiKey) {
      return NextResponse.json({ error: "X-Provider-Key header required" }, { status: 401 });
    }
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header required" }, { status: 400 });
    }

    // Check idempotency — return existing event if already processed
    const existingEvent = await prisma.completionEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existingEvent) {
      return NextResponse.json({
        duplicate: true,
        eventId: existingEvent.id,
        status: existingEvent.status,
        cpdRecordId: existingEvent.cpdRecordId,
      });
    }

    // Verify provider API key
    const providers = await prisma.providerTenant.findMany({ where: { active: true } });
    let matchedProvider = null;
    for (const p of providers) {
      if (await bcrypt.compare(apiKey, p.apiKeyHash)) {
        matchedProvider = p;
        break;
      }
    }

    if (!matchedProvider) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
    }

    const body = await req.json();
    const { userEmail, activityTitle, hours, category, completedAt, payload } = body;

    if (!userEmail || !activityTitle || typeof hours !== "number") {
      return NextResponse.json(
        { error: "userEmail, activityTitle, and hours are required" },
        { status: 400 }
      );
    }

    if (hours <= 0) {
      return NextResponse.json({ error: "hours must be positive" }, { status: 400 });
    }

    // Try to match user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    // Create the completion event
    const event = await prisma.completionEvent.create({
      data: {
        providerId: matchedProvider.id,
        userId: user?.id ?? null,
        externalUserRef: userEmail,
        activityTitle,
        hours,
        category: category ?? null,
        completedAt: new Date(completedAt ?? new Date()),
        payload: JSON.stringify(payload ?? body),
        idempotencyKey,
        status: user ? "matched" : "pending",
      },
    });

    // If user matched, auto-create CPD record
    let cpdRecord = null;
    if (user) {
      cpdRecord = await prisma.cpdRecord.create({
        data: {
          userId: user.id,
          title: activityTitle,
          provider: matchedProvider.name,
          activityType: "structured",
          hours,
          date: new Date(completedAt ?? new Date()),
          status: "completed",
          category: category ?? "general",
          source: "auto",
          evidenceStrength: "provider_verified",
          externalId: event.id,
        },
      });

      await prisma.completionEvent.update({
        where: { id: event.id },
        data: { status: "applied", cpdRecordId: cpdRecord.id },
      });
    }

    return NextResponse.json({
      eventId: event.id,
      status: cpdRecord ? "applied" : "pending",
      userMatched: !!user,
      cpdRecordId: cpdRecord?.id ?? null,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
