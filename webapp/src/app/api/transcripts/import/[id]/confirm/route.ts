import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// POST /api/transcripts/import/:id/confirm — apply the import, creating CPD records
// Body: { entries: [{ index, credentialId?, category?, include: boolean }] }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = withRateLimit(req, "transcript-confirm", { windowMs: 60_000, max: 10 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const body = await req.json();

    const importRecord = await prisma.externalTranscriptImport.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!importRecord) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    if (importRecord.status === "imported") {
      return NextResponse.json({ error: "Import already applied" }, { status: 409 });
    }

    const entries = JSON.parse(importRecord.parsed) as Array<Record<string, unknown>>;
    const mappings = Array.isArray(body.entries) ? body.entries : [];

    const created = [];
    const skipped = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const mapping = mappings.find((m: Record<string, unknown>) => m.index === i);

      // Skip if explicitly excluded
      if (mapping && mapping.include === false) {
        skipped.push({ index: i, title: entry.title, reason: "excluded" });
        continue;
      }

      // Check for duplicates
      const existing = await prisma.cpdRecord.findFirst({
        where: {
          userId: session.user.id,
          title: entry.title as string,
          date: new Date(entry.date as string),
          hours: entry.hours as number,
        },
      });

      if (existing) {
        skipped.push({ index: i, title: entry.title, reason: "duplicate" });
        continue;
      }

      const record = await prisma.cpdRecord.create({
        data: {
          userId: session.user.id,
          title: entry.title as string,
          provider: (entry.provider as string) ?? null,
          activityType: (entry.activityType as string) ?? "structured",
          hours: entry.hours as number,
          date: new Date(entry.date as string),
          status: "completed",
          category: (mapping?.category as string) ?? (entry.category as string) ?? "general",
          externalId: (entry.externalId as string) ?? null,
          source: "import",
          evidenceStrength: "certificate_attached",
        },
      });

      created.push(record);
    }

    // Update import record
    await prisma.externalTranscriptImport.update({
      where: { id },
      data: {
        status: "imported",
        importedAt: new Date(),
        mapping: JSON.stringify(mappings),
      },
    });

    return NextResponse.json({
      imported: true,
      created: created.length,
      skipped: skipped.length,
      skippedDetails: skipped,
      records: created.map((r) => ({
        id: r.id,
        title: r.title,
        hours: r.hours,
        date: r.date.toISOString(),
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
