/**
 * CPD Record CRUD - GET/PATCH/DELETE /api/cpd-records/[id]
 *
 * GET:    Retrieve a single CPD record (owner only)
 * PATCH:  Update a manually-logged CPD record (title, hours, date, etc.)
 *         Platform-generated records (source="platform") cannot be edited
 *         because they are auto-created by quiz pass and serve as audit evidence.
 * DELETE: Soft-delete a manually-logged CPD record. Platform records cannot be
 *         deleted because they are linked to certificates and quiz attempts.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/cpd-records/[id] - Get a single CPD record
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.cpdRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: record.id,
    title: record.title,
    provider: record.provider,
    activityType: record.activityType,
    hours: record.hours,
    date: record.date.toISOString(),
    status: record.status,
    category: record.category,
    learningOutcome: record.learningOutcome,
    notes: record.notes,
    source: record.source,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

// PATCH /api/cpd-records/[id] - Update a CPD record
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.cpdRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  // Platform-generated records (from quizzes) are immutable audit evidence
  if (record.source === "platform") {
    return NextResponse.json(
      { error: "Platform-generated records cannot be edited" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.provider !== undefined) updates.provider = body.provider;
  if (body.activityType !== undefined) updates.activityType = body.activityType;
  if (body.hours !== undefined) {
    const hours = parseFloat(body.hours);
    if (hours <= 0 || hours > 100) {
      return NextResponse.json(
        { error: "Hours must be between 0 and 100" },
        { status: 400 }
      );
    }
    updates.hours = hours;
  }
  if (body.date !== undefined) updates.date = new Date(body.date);
  if (body.status !== undefined) updates.status = body.status;
  if (body.category !== undefined) updates.category = body.category;
  if (body.learningOutcome !== undefined) updates.learningOutcome = body.learningOutcome;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.cpdRecord.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    provider: updated.provider,
    activityType: updated.activityType,
    hours: updated.hours,
    date: updated.date.toISOString(),
    status: updated.status,
    category: updated.category,
    source: updated.source,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

// DELETE /api/cpd-records/[id] - Delete a CPD record
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.cpdRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  // Platform-generated records are linked to certificates/quiz attempts
  if (record.source === "platform") {
    return NextResponse.json(
      { error: "Platform-generated records cannot be deleted" },
      { status: 403 }
    );
  }

  await prisma.cpdRecord.delete({ where: { id } });

  return NextResponse.json({ deleted: true, id });
}
