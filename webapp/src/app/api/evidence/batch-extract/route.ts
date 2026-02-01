import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { extractEvidenceMetadata } from "@/lib/extract";
import path from "path";

/**
 * POST /api/evidence/batch-extract
 *
 * Run AI metadata extraction on multiple evidence items at once.
 * Accepts up to 20 evidence IDs. Rate limited to 5 requests per minute.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "evidence-batch-extract", { windowMs: 60_000, max: 5 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const body = await req.json();
    const { evidenceIds } = body;

    if (!Array.isArray(evidenceIds)) {
      return apiError("evidenceIds must be an array", 400);
    }

    if (evidenceIds.length === 0) {
      return apiError("evidenceIds must not be empty", 400);
    }

    if (evidenceIds.length > 20) {
      return apiError("Maximum 20 evidence items per batch", 400);
    }

    // Fetch all evidence items owned by the user
    const evidenceItems = await prisma.evidence.findMany({
      where: {
        id: { in: evidenceIds },
        userId: session.user.id,
      },
    });

    const foundIds = new Set(evidenceItems.map((e) => e.id));

    const results: Array<{ id: string; extracted: unknown; error?: string }> = [];

    for (const eid of evidenceIds) {
      if (!foundIds.has(eid)) {
        results.push({ id: eid, extracted: null, error: "Evidence not found or not owned by user" });
        continue;
      }

      const evidence = evidenceItems.find((e) => e.id === eid)!;

      try {
        const filePath = path.join(process.cwd(), evidence.storageKey);
        const extracted = await extractEvidenceMetadata(
          filePath,
          evidence.fileType,
          evidence.fileName
        );

        // Persist extracted metadata if confidence > 0
        if (extracted && extracted.confidence > 0) {
          await prisma.evidence.update({
            where: { id: evidence.id },
            data: { extractedMetadata: JSON.stringify(extracted) },
          });
        }

        results.push({ id: eid, extracted });
      } catch (err) {
        results.push({
          id: eid,
          extracted: null,
          error: err instanceof Error ? err.message : "Extraction failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return serverError(err);
  }
}
