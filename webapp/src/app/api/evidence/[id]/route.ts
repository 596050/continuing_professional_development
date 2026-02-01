import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

// GET /api/evidence/[id] - download evidence file
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

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

    const filePath = path.join(process.cwd(), evidence.storageKey);

    try {
      const fileBuffer = await readFile(filePath);

      const contentType =
        evidence.fileType === "pdf"
          ? "application/pdf"
          : evidence.fileType === "image"
            ? "image/jpeg"
            : "application/octet-stream";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${evidence.fileName}"`,
          "Content-Length": String(fileBuffer.length),
        },
      });
    } catch {
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/evidence/[id] - update evidence (assign to record, change kind/status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

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

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.fileName !== undefined) updates.fileName = body.fileName;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    if (body.extractedMetadata !== undefined) {
      updates.extractedMetadata = typeof body.extractedMetadata === "string"
        ? body.extractedMetadata
        : JSON.stringify(body.extractedMetadata);
    }

    // Kind update
    if (body.kind !== undefined) {
      const validKinds = ["certificate", "transcript", "agenda", "screenshot", "other"];
      if (!validKinds.includes(body.kind)) {
        return NextResponse.json(
          { error: `Invalid kind. Accepted: ${validKinds.join(", ")}` },
          { status: 400 }
        );
      }
      updates.kind = body.kind;
    }

    // Status update (soft delete, dismiss)
    if (body.status !== undefined) {
      const validStatuses = ["inbox", "assigned", "deleted"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Accepted: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    // Assign to CPD record
    if (body.cpdRecordId !== undefined) {
      if (body.cpdRecordId) {
        const record = await prisma.cpdRecord.findFirst({
          where: { id: body.cpdRecordId, userId: session.user.id },
        });
        if (!record) {
          return NextResponse.json(
            { error: "CPD record not found" },
            { status: 404 }
          );
        }
        updates.cpdRecordId = body.cpdRecordId;
        updates.status = "assigned";
      } else {
        // Unassign - move back to inbox
        updates.cpdRecordId = null;
        updates.status = "inbox";
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.evidence.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      id: updated.id,
      fileName: updated.fileName,
      cpdRecordId: updated.cpdRecordId,
      kind: updated.kind,
      status: updated.status,
      metadata: updated.metadata,
      extractedMetadata: updated.extractedMetadata,
    });
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/evidence/[id] - delete evidence
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

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

    await prisma.evidence.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
