import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/reminders - list reminders for authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // pending | sent | dismissed
    const type = searchParams.get("type"); // deadline | progress | custom

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status) where.status = status;
    if (type) where.type = type;

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { triggerDate: "asc" },
      take: 50,
    });

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
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/reminders - create a new reminder
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, title, message, triggerDate, channel, credentialId, metadata } = body;

    // Validate required fields
    if (!type || !title || !triggerDate) {
      return NextResponse.json(
        { error: "type, title, and triggerDate are required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["deadline", "progress", "custom"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate channel
    const validChannels = ["email", "calendar", "both"];
    if (channel && !validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `channel must be one of: ${validChannels.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate triggerDate is in the future
    const triggerDateParsed = new Date(triggerDate);
    if (isNaN(triggerDateParsed.getTime())) {
      return NextResponse.json(
        { error: "triggerDate must be a valid date" },
        { status: 400 }
      );
    }

    // Validate credentialId belongs to user (if provided)
    if (credentialId) {
      const userCred = await prisma.userCredential.findFirst({
        where: { userId: session.user.id, credentialId },
      });
      if (!userCred) {
        return NextResponse.json(
          { error: "Credential not found for this user" },
          { status: 404 }
        );
      }
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: session.user.id,
        type,
        title,
        message: message ?? null,
        triggerDate: triggerDateParsed,
        channel: channel ?? "email",
        credentialId: credentialId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
