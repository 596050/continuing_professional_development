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
import { requireAuth, apiError, validationError, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { updateCpdRecordSchema } from "@/lib/schemas";

// GET /api/cpd-records/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const record = await prisma.cpdRecord.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!record) return apiError("Record not found", 404);

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
      evidenceStrength: record.evidenceStrength,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/cpd-records/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const record = await prisma.cpdRecord.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!record) return apiError("Record not found", 404);

    if (record.source === "platform") {
      return apiError("Platform-generated records cannot be edited", 403);
    }

    const body = await request.json();
    const parsed = updateCpdRecordSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;
    const updates: Record<string, unknown> = {};

    if (data.title !== undefined) updates.title = data.title;
    if (data.provider !== undefined) updates.provider = data.provider || null;
    if (data.activityType !== undefined) updates.activityType = data.activityType;
    if (data.hours !== undefined) updates.hours = data.hours;
    if (data.date !== undefined) updates.date = data.date;
    if (data.status !== undefined) updates.status = data.status;
    if (data.category !== undefined) updates.category = data.category;
    if (data.learningOutcome !== undefined) updates.learningOutcome = data.learningOutcome || null;
    if (data.notes !== undefined) updates.notes = data.notes || null;

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
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/cpd-records/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const record = await prisma.cpdRecord.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!record) return apiError("Record not found", 404);

    if (record.source === "platform") {
      return apiError("Platform-generated records cannot be deleted", 403);
    }

    await prisma.cpdRecord.delete({ where: { id } });

    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return serverError(err);
  }
}
