import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

// GET /api/evidence/[id] - download evidence file
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/evidence/[id] - update evidence metadata
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
    if (body.cpdRecordId !== undefined) updates.cpdRecordId = body.cpdRecordId;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

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
      metadata: updated.metadata,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/evidence/[id] - delete evidence
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
