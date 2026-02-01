import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/evidence/[id]/create-record - create a CPD record from inbox evidence
export async function POST(
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

    const evidence = await prisma.evidence.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 }
      );
    }

    if (evidence.status === "deleted") {
      return NextResponse.json(
        { error: "Cannot create record from deleted evidence" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Required fields
    if (!body.title || !body.hours || !body.date) {
      return NextResponse.json(
        { error: "title, hours, and date are required" },
        { status: 400 }
      );
    }

    const hours = parseFloat(body.hours);
    if (isNaN(hours) || hours <= 0 || hours > 100) {
      return NextResponse.json(
        { error: "Hours must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Create the CPD record
    const record = await prisma.cpdRecord.create({
      data: {
        userId: session.user.id,
        title: body.title,
        provider: body.provider || null,
        activityType: body.activityType || "structured",
        hours,
        date: new Date(body.date),
        status: body.status || "completed",
        category: body.category || "general",
        learningOutcome: body.learningOutcome || null,
        notes: body.notes || null,
        source: "manual",
      },
    });

    // Link evidence to the new record and mark as assigned
    await prisma.evidence.update({
      where: { id },
      data: {
        cpdRecordId: record.id,
        status: "assigned",
      },
    });

    return NextResponse.json(
      {
        record: {
          id: record.id,
          title: record.title,
          hours: record.hours,
          date: record.date.toISOString(),
          category: record.category,
        },
        evidence: {
          id: evidence.id,
          status: "assigned",
          cpdRecordId: record.id,
        },
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
