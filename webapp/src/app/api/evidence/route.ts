import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { parsePagination, EVIDENCE_KINDS, EVIDENCE_STRENGTH_RANK } from "@/lib/schemas";

// GET /api/evidence - list evidence for authenticated user
// Supports filtering: ?status=inbox&kind=certificate&cpdRecordId=xxx&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const cpdRecordId = searchParams.get("cpdRecordId");
    const status = searchParams.get("status");
    const kind = searchParams.get("kind");
    const { limit, skip } = parsePagination(searchParams);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (cpdRecordId) where.cpdRecordId = cpdRecordId;
    if (status) where.status = status;
    if (kind) where.kind = kind;

    // By default, exclude deleted evidence
    if (!status) {
      where.status = { not: "deleted" };
    }

    const [evidence, total] = await Promise.all([
      prisma.evidence.findMany({
        where,
        orderBy: { uploadedAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.evidence.count({ where }),
    ]);

    return NextResponse.json({
      evidence: evidence.map((e) => ({
        id: e.id,
        fileName: e.fileName,
        fileType: e.fileType,
        fileSize: e.fileSize,
        cpdRecordId: e.cpdRecordId,
        kind: e.kind,
        status: e.status,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        extractedMetadata: e.extractedMetadata ? JSON.parse(e.extractedMetadata) : null,
        uploadedAt: e.uploadedAt.toISOString(),
      })),
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
    });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/evidence - upload evidence file
// Supports optional `kind` field. If no cpdRecordId, goes to inbox.
export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "evidence-upload", { windowMs: 60_000, max: 20 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const cpdRecordId = formData.get("cpdRecordId") as string | null;
    const metadataStr = formData.get("metadata") as string | null;
    const kind = (formData.get("kind") as string) || "other";

    if (!file) {
      return apiError("File is required", 400);
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return apiError("File size must be less than 10MB", 400);
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
      return apiError("File type not allowed. Accepted: PDF, JPEG, PNG, WebP, Text", 400);
    }

    // Validate file extension matches MIME type
    const fileExt = path.extname(file.name).toLowerCase();
    const validExtensions: Record<string, string[]> = {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "text/plain": [".txt", ".csv"],
    };
    if (validExtensions[fileType] && !validExtensions[fileType].includes(fileExt)) {
      return apiError("File extension does not match file type", 400);
    }

    // Validate kind
    const validKinds = EVIDENCE_KINDS as readonly string[];
    if (!validKinds.includes(kind)) {
      return apiError(`Invalid kind. Accepted: ${validKinds.join(", ")}`, 400);
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

    // Generate auto-naming convention
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

    // Determine status: if linked to a record, it's assigned; otherwise inbox
    const evidenceStatus = cpdRecordId ? "assigned" : "inbox";

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
        kind,
        status: evidenceStatus,
      },
    });

    // Auto-upgrade evidenceStrength on the linked CPD record
    if (cpdRecordId) {
      const newStrength = kind === "certificate" ? "certificate_attached" : "url_only";
      const linkedRecord = await prisma.cpdRecord.findUnique({
        where: { id: cpdRecordId },
        select: { evidenceStrength: true },
      });
      const currentRank = EVIDENCE_STRENGTH_RANK[linkedRecord?.evidenceStrength ?? "manual_only"] ?? 0;
      const newRank = EVIDENCE_STRENGTH_RANK[newStrength] ?? 0;
      if (newRank > currentRank) {
        await prisma.cpdRecord.update({
          where: { id: cpdRecordId },
          data: { evidenceStrength: newStrength },
        });
      }
    }

    return NextResponse.json(
      {
        id: evidence.id,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        storageKey: evidence.storageKey,
        kind: evidence.kind,
        status: evidence.status,
        uploadedAt: evidence.uploadedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    return serverError(err);
  }
}
