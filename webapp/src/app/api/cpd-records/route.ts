import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const records = await prisma.cpdRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        title: r.title,
        provider: r.provider,
        activityType: r.activityType,
        hours: r.hours,
        date: r.date.toISOString(),
        status: r.status,
        category: r.category,
        learningOutcome: r.learningOutcome,
        notes: r.notes,
        source: r.source,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const data = await req.json();

    // Validate required fields
    if (!data.title || !data.hours || !data.date || !data.activityType) {
      return NextResponse.json(
        { error: "Title, hours, date, and activity type are required" },
        { status: 400 }
      );
    }

    if (data.hours <= 0 || data.hours > 100) {
      return NextResponse.json(
        { error: "Hours must be between 0 and 100" },
        { status: 400 }
      );
    }

    const record = await prisma.cpdRecord.create({
      data: {
        userId: session.user.id,
        title: data.title,
        provider: data.provider || null,
        activityType: data.activityType,
        hours: parseFloat(data.hours),
        date: new Date(data.date),
        status: data.status || "completed",
        category: data.category || "general",
        learningOutcome: data.learningOutcome || null,
        notes: data.notes || null,
        source: "manual",
      },
    });

    return NextResponse.json({
      id: record.id,
      title: record.title,
      hours: record.hours,
      date: record.date.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
