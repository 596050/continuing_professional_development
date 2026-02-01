import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, validationError, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createReminderSchema, parsePagination } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const { limit, skip } = parsePagination(searchParams);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status) where.status = status;
    if (type) where.type = type;

    const [reminders, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        orderBy: { triggerDate: "asc" },
        take: limit,
        skip,
      }),
      prisma.reminder.count({ where }),
    ]);

    return NextResponse.json({
      reminders: reminders.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        message: r.message,
        triggerDate: r.triggerDate.toISOString(),
        channel: r.channel,
        status: r.status,
        credentialId: r.credentialId,
        metadata: r.metadata ? JSON.parse(r.metadata) : null,
        createdAt: r.createdAt.toISOString(),
        sentAt: r.sentAt?.toISOString() ?? null,
      })),
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "reminder-create", { windowMs: 60_000, max: 30 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const body = await req.json();
    const parsed = createReminderSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    // Validate credentialId belongs to user (if provided)
    if (data.credentialId) {
      const userCred = await prisma.userCredential.findFirst({
        where: { userId: session.user.id, credentialId: data.credentialId },
      });
      if (!userCred) return apiError("Credential not found for this user", 404);
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: session.user.id,
        type: data.type,
        title: data.title,
        message: data.message ?? null,
        triggerDate: data.triggerDate,
        channel: data.channel,
        credentialId: data.credentialId ?? null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    return NextResponse.json(
      {
        id: reminder.id,
        type: reminder.type,
        title: reminder.title,
        message: reminder.message,
        triggerDate: reminder.triggerDate.toISOString(),
        channel: reminder.channel,
        status: reminder.status,
        credentialId: reminder.credentialId,
        createdAt: reminder.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    return serverError(err);
  }
}
