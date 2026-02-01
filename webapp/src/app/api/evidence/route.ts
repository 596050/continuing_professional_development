import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET /api/evidence - list evidence for authenticated user
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
    const cpdRecordId = searchParams.get("cpdRecordId");

    const where: Record<string, unknown> = { userId: session.user.id };
    if (cpdRecordId) where.cpdRecordId = cpdRecordId;

    const evidence = await prisma.evidence.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      evidence: evidence.map((e) => ({
        id: e.id,
        fileName: e.fileName,
        fileType: e.fileType,
        fileSize: e.fileSize,
        cpdRecordId: e.cpdRecordId,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        uploadedAt: e.uploadedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/evidence - upload evidence file
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const cpdRecordId = formData.get("cpdRecordId") as string | null;
    const metadataStr = formData.get("metadata") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ];
    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          error:
            "File type not allowed. Accepted: PDF, JPEG, PNG, WebP, Text",
        },
        { status: 400 }
      );
    }

    // Validate CPD record belongs to user (if provided)
    if (cpdRecordId) {
      const record = await prisma.cpdRecord.findFirst({
        where: { id: cpdRecordId, userId: session.user.id },
      });
      if (!record) {
        return NextResponse.json(
          { error: "CPD record not found" },
          { status: 404 }
        );
      }
    }

    // Generate auto-naming convention: credential_date_title.ext
    const ext = path.extname(file.name) || ".pdf";
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const sanitized = file.name
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);
    const storedName = `${timestamp}_${sanitized}${ext}`;

    // Create user upload directory
    const userDir = path.join(process.cwd(), "uploads", session.user.id);
    await mkdir(userDir, { recursive: true });

    // Write file
    const filePath = path.join(userDir, storedName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const storageKey = `uploads/${session.user.id}/${storedName}`;

    // Determine file category
    let detectedType = "pdf";
    if (fileType.startsWith("image/")) detectedType = "image";
    else if (fileType === "text/plain") detectedType = "text";

    // Save to database
    const evidence = await prisma.evidence.create({
      data: {
        userId: session.user.id,
        cpdRecordId: cpdRecordId || null,
        fileName: file.name,
        fileType: detectedType,
        fileSize: file.size,
        storageKey,
        metadata: metadataStr || null,
      },
    });

    return NextResponse.json(
      {
        id: evidence.id,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        storageKey: evidence.storageKey,
        uploadedAt: evidence.uploadedAt.toISOString(),
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
