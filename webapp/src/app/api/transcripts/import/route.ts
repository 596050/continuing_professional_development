import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { parseTranscript } from "@/lib/parsers";

// POST /api/transcripts/import — upload and parse a transcript file
// Body: { sourceCode: string, content: string (base64 or text), fileName: string }
export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "transcript-import", { windowMs: 60_000, max: 10 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const body = await req.json();
    const { sourceCode, content, fileName } = body;

    if (!sourceCode || !content) {
      return NextResponse.json(
        { error: "sourceCode and content are required" },
        { status: 400 }
      );
    }

    // Find the source
    const source = await prisma.externalTranscriptSource.findUnique({
      where: { code: sourceCode },
    });

    if (!source) {
      return NextResponse.json({ error: "Unknown transcript source" }, { status: 404 });
    }

    // Parse the transcript
    const parsed = parseTranscript(sourceCode, content);

    // Create the import record
    const importRecord = await prisma.externalTranscriptImport.create({
      data: {
        userId: session.user.id,
        sourceId: source.id,
        status: parsed.length > 0 ? "parsed" : "failed",
        parsed: JSON.stringify(parsed),
        errorLog: parsed.length === 0 ? JSON.stringify({ error: "No entries parsed" }) : null,
      },
    });

    return NextResponse.json({
      importId: importRecord.id,
      sourceCode,
      sourceName: source.name,
      status: importRecord.status,
      entryCount: parsed.length,
      entries: parsed,
      fileName: fileName ?? null,
    });
  } catch (err) {
    return serverError(err);
  }
}

// GET /api/transcripts/import — list user's transcript imports
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status) where.status = status;

    const imports = await prisma.externalTranscriptImport.findMany({
      where,
      include: { source: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      imports: imports.map((i) => ({
        id: i.id,
        sourceCode: i.source.code,
        sourceName: i.source.name,
        status: i.status,
        entryCount: JSON.parse(i.parsed).length,
        importedAt: i.importedAt,
        createdAt: i.createdAt,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
