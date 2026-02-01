import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/transcripts/import/:id — get parsed preview of a transcript import
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id } = await params;

    const importRecord = await prisma.externalTranscriptImport.findFirst({
      where: { id, userId: session.user.id },
      include: { source: { select: { code: true, name: true } } },
    });

    if (!importRecord) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    const entries = JSON.parse(importRecord.parsed);

    // Check for duplicates against existing CPD records
    const existingRecords = await prisma.cpdRecord.findMany({
      where: { userId: session.user.id },
      select: { title: true, date: true, hours: true, externalId: true },
    });

    const entriesWithDuplicateCheck = entries.map((entry: Record<string, unknown>) => {
      const isDuplicate = existingRecords.some(
        (r) =>
          (entry.externalId && r.externalId === entry.externalId) ||
          (r.title === entry.title &&
            r.hours === entry.hours &&
            r.date &&
            new Date(r.date).toISOString().slice(0, 10) === String(entry.date))
      );
      return { ...entry, isDuplicate };
    });

    return NextResponse.json({
      id: importRecord.id,
      sourceCode: importRecord.source.code,
      sourceName: importRecord.source.name,
      status: importRecord.status,
      entries: entriesWithDuplicateCheck,
      mapping: importRecord.mapping ? JSON.parse(importRecord.mapping) : null,
      errorLog: importRecord.errorLog ? JSON.parse(importRecord.errorLog) : null,
      createdAt: importRecord.createdAt,
      importedAt: importRecord.importedAt,
    });
  } catch (err) {
    return serverError(err);
  }
}
