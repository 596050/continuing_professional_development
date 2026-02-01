import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/reminders/[id] - get a single reminder
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: reminder.id,
      type: reminder.type,
      title: reminder.title,
      message: reminder.message,
      triggerDate: reminder.triggerDate.toISOString(),
      channel: reminder.channel,
      status: reminder.status,
      credentialId: reminder.credentialId,
      metadata: reminder.metadata ? JSON.parse(reminder.metadata) : null,
      createdAt: reminder.createdAt.toISOString(),
      sentAt: reminder.sentAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/reminders/[id] - update a reminder (dismiss, reschedule, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.reminder.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status) {
      const validStatuses = ["pending", "sent", "dismissed", "failed"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
      if (body.status === "sent") updates.sentAt = new Date();
    }

    if (body.triggerDate) {
      const parsed = new Date(body.triggerDate);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "triggerDate must be a valid date" },
          { status: 400 }
        );
      }
      updates.triggerDate = parsed;
    }

    if (body.title) updates.title = body.title;
    if (body.message !== undefined) updates.message = body.message;
    if (body.channel) updates.channel = body.channel;

    const reminder = await prisma.reminder.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      id: reminder.id,
      type: reminder.type,
      title: reminder.title,
      message: reminder.message,
      triggerDate: reminder.triggerDate.toISOString(),
      channel: reminder.channel,
      status: reminder.status,
      createdAt: reminder.createdAt.toISOString(),
      sentAt: reminder.sentAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/reminders/[id] - delete a reminder
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.reminder.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    await prisma.reminder.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
