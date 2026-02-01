import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { extractEvidenceMetadata } from "@/lib/extract";
import path from "path";

// POST /api/evidence/[id]/extract - run AI metadata extraction on evidence
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = withRateLimit(req, "evidence-extract", { windowMs: 60_000, max: 10 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id } = await params;

    // Validate evidence belongs to user
    const evidence = await prisma.evidence.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!evidence) {
      return apiError("Evidence not found", 404);
    }

    // Build file path from storageKey
    const filePath = path.join(process.cwd(), evidence.storageKey);

    // Run extraction
    const extracted = await extractEvidenceMetadata(
      filePath,
      evidence.fileType,
      evidence.fileName
    );

    // Persist the extracted metadata
    if (extracted && extracted.confidence > 0) {
      await prisma.evidence.update({
        where: { id: evidence.id },
        data: { extractedMetadata: JSON.stringify(extracted) },
      });
    }

    return NextResponse.json({ extracted });
  } catch (err) {
    return serverError(err);
  }
}
