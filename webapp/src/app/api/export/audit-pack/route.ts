import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generateAuditReport, generateAuditCsv } from "@/lib/pdf";
import { Readable } from "stream";

// GET /api/export/audit-pack?credentialId=xxx&from=2026-01-01&to=2026-12-31&minStrength=manual_only
// Returns a ZIP file containing: transcript PDF, CSV log, and evidence files
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get("credentialId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const minStrength = searchParams.get("minStrength") || "manual_only";

    // Strength levels ordered by strength
    const strengthLevels = ["manual_only", "url_only", "certificate_attached", "provider_verified"];
    const minIndex = strengthLevels.indexOf(minStrength);
    const allowedStrengths = minIndex >= 0 ? strengthLevels.slice(minIndex) : strengthLevels;

    // Build record query
    const where: Record<string, unknown> = {
      userId: session.user.id,
      status: "completed",
      evidenceStrength: { in: allowedStrengths },
    };
    if (from) where.date = { ...((where.date as Record<string, unknown>) || {}), gte: new Date(from) };
    if (to) where.date = { ...((where.date as Record<string, unknown>) || {}), lte: new Date(to) };

    // Get user info
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get credential
    let credential = null;
    let userCredential = null;
    if (credentialId) {
      userCredential = await prisma.userCredential.findFirst({
        where: { userId: session.user.id, credentialId },
        include: { credential: true },
      });
    } else {
      userCredential = await prisma.userCredential.findFirst({
        where: { userId: session.user.id, isPrimary: true },
        include: { credential: true },
      });
    }
    credential = userCredential?.credential;

    if (!credential) {
      return NextResponse.json({ error: "No credential found" }, { status: 404 });
    }

    // Get records
    const records = await prisma.cpdRecord.findMany({
      where,
      orderBy: { date: "desc" },
      include: { evidence: { where: { status: { not: "deleted" } } } },
    });

    // Get all evidence for these records + unassigned
    const evidence = await prisma.evidence.findMany({
      where: {
        userId: session.user.id,
        status: { not: "deleted" },
      },
    });

    const certificates = await prisma.certificate.findMany({
      where: { userId: session.user.id, status: "active" },
    });

    // Build strength summary
    const strengthSummary = {
      manual_only: records.filter((r) => r.evidenceStrength === "manual_only").length,
      url_only: records.filter((r) => r.evidenceStrength === "url_only").length,
      certificate_attached: records.filter((r) => r.evidenceStrength === "certificate_attached").length,
      provider_verified: records.filter((r) => r.evidenceStrength === "provider_verified").length,
    };

    // Generate PDF transcript
    const progressInfo = {
      totalHoursCompleted: records.reduce((sum, r) => sum + r.hours, 0),
      hoursRequired: credential.hoursRequired ?? 0,
      ethicsHoursCompleted: records.filter((r) => r.category === "ethics").reduce((sum, r) => sum + r.hours, 0),
      ethicsRequired: credential.ethicsHours ?? 0,
      structuredHoursCompleted: records
        .filter((r) => ["structured", "verifiable"].includes(r.activityType))
        .reduce((sum, r) => sum + r.hours, 0),
      structuredRequired: credential.structuredHours ?? 0,
      progressPercent: Math.min(
        100,
        Math.round(
          (records.reduce((sum, r) => sum + r.hours, 0) / (credential.hoursRequired || 1)) * 100
        )
      ),
      certificateCount: certificates.length,
    };

    const activities = records.map((r) => ({
      title: r.title,
      provider: r.provider,
      activityType: r.activityType,
      hours: r.hours,
      date: r.date.toISOString(),
      status: r.status,
      category: r.category,
    }));

    const evidenceList = evidence
      .filter((e) => e.status !== "deleted")
      .map((e) => ({
        fileName: e.fileName,
        fileType: e.fileType,
        uploadedAt: e.uploadedAt.toISOString(),
        cpdRecordId: e.cpdRecordId,
      }));

    const deadlineInfo = {
      renewalDeadline: userCredential?.renewalDeadline?.toISOString() ?? null,
      daysUntilDeadline: userCredential?.renewalDeadline
        ? Math.ceil((userCredential.renewalDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
      jurisdiction: userCredential?.jurisdiction ?? null,
    };

    const userInfo = { name: user.name ?? "", email: user.email, plan: user.plan };
    const credentialInfo = {
      name: credential.name,
      body: credential.body,
      region: credential.region,
      hoursRequired: credential.hoursRequired ?? 0,
      ethicsRequired: credential.ethicsHours ?? 0,
      structuredRequired: credential.structuredHours ?? 0,
      cycleLengthYears: credential.cycleLengthYears,
    };

    // Generate CSV
    const csvContent = generateAuditCsv(userInfo, credentialInfo, activities);

    // Generate PDF as buffer
    const pdfDoc = generateAuditReport(
      userInfo,
      credentialInfo,
      progressInfo,
      deadlineInfo,
      activities,
      evidenceList
    );

    const pdfChunks: Uint8Array[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = pdfDoc as unknown as Readable;
      stream.on("data", (chunk: Uint8Array) => pdfChunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });
    const pdfBuffer = Buffer.concat(pdfChunks);

    // Read evidence files
    const evidenceFiles: Array<{ name: string; data: Buffer }> = [];
    const fs = await import("fs/promises");
    for (const ev of evidence.filter((e) => e.status !== "deleted")) {
      try {
        const data = await fs.readFile(ev.storageKey);
        evidenceFiles.push({ name: ev.fileName, data: Buffer.from(data) });
      } catch {
        // File may not exist on disk; skip
      }
    }

    // Build ZIP manually (simple ZIP format without compression for reliability)
    const zipParts: Array<{ name: string; data: Buffer }> = [
      { name: "transcript.pdf", data: pdfBuffer },
      { name: "activity-log.csv", data: Buffer.from(csvContent, "utf-8") },
      { name: "summary.json", data: Buffer.from(JSON.stringify({
        user: { name: user.name, email: user.email },
        credential: credential.name,
        generatedAt: new Date().toISOString(),
        recordCount: records.length,
        totalHours: progressInfo.totalHoursCompleted,
        strengthSummary,
        filters: { credentialId, from, to, minStrength },
      }, null, 2), "utf-8") },
      ...evidenceFiles.map((f) => ({ name: `evidence/${f.name}`, data: f.data })),
    ];

    const zipBuffer = buildZip(zipParts);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="audit-pack-${credential.name}-${new Date().toISOString().slice(0, 10)}.zip"`,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

// Simple ZIP builder (store-only, no compression)
function buildZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf-8");
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    // CRC32
    const crc = crc32(file.data);

    // Local file header
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression (store)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(file.data.length, 18); // compressed size
    localHeader.writeUInt32LE(file.data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length

    parts.push(localHeader, nameBytes, file.data);

    // Central directory entry
    const centralEntry = Buffer.alloc(46);
    centralEntry.writeUInt32LE(0x02014b50, 0); // signature
    centralEntry.writeUInt16LE(20, 4); // version made by
    centralEntry.writeUInt16LE(20, 6); // version needed
    centralEntry.writeUInt16LE(0, 8); // flags
    centralEntry.writeUInt16LE(0, 10); // compression
    centralEntry.writeUInt16LE(dosTime, 12);
    centralEntry.writeUInt16LE(dosDate, 14);
    centralEntry.writeUInt32LE(crc, 16);
    centralEntry.writeUInt32LE(file.data.length, 20);
    centralEntry.writeUInt32LE(file.data.length, 24);
    centralEntry.writeUInt16LE(nameBytes.length, 28);
    centralEntry.writeUInt16LE(0, 30); // extra field length
    centralEntry.writeUInt16LE(0, 32); // comment length
    centralEntry.writeUInt16LE(0, 34); // disk number start
    centralEntry.writeUInt16LE(0, 36); // internal attrs
    centralEntry.writeUInt32LE(0, 38); // external attrs
    centralEntry.writeUInt32LE(offset, 42); // local header offset

    centralDir.push(centralEntry, nameBytes);

    offset += localHeader.length + nameBytes.length + file.data.length;
  }

  const centralDirOffset = offset;
  const centralDirBuffer = Buffer.concat(centralDir);

  // End of central directory
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // signature
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // disk with central dir
  endRecord.writeUInt16LE(files.length, 8); // entries on this disk
  endRecord.writeUInt16LE(files.length, 10); // total entries
  endRecord.writeUInt32LE(centralDirBuffer.length, 12);
  endRecord.writeUInt32LE(centralDirOffset, 16);
  endRecord.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...parts, centralDirBuffer, endRecord]);
}

// CRC32 implementation
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
