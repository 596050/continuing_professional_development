import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/rule-packs - list rule packs, optionally filtered by credentialId
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get("credentialId");

    const where: Record<string, unknown> = {};
    if (credentialId) where.credentialId = credentialId;

    const packs = await prisma.credentialRulePack.findMany({
      where,
      orderBy: [{ credentialId: "asc" }, { effectiveFrom: "desc" }],
      include: { credential: { select: { name: true, body: true, region: true } } },
    });

    return NextResponse.json({
      rulePacks: packs.map((p) => ({
        id: p.id,
        credentialId: p.credentialId,
        credentialName: p.credential.name,
        version: p.version,
        name: p.name,
        rules: JSON.parse(p.rules),
        effectiveFrom: p.effectiveFrom.toISOString(),
        effectiveTo: p.effectiveTo?.toISOString() ?? null,
        changelog: p.changelog,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/rule-packs - create a new rule pack version (admin only)
export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "rule-pack-create", { windowMs: 60_000, max: 10 });
    if (limited) return limited;

    const session = await requireRole("admin");
    if (session instanceof NextResponse) return session;

    const body = await req.json();

    if (!body.credentialId || !body.name || !body.rules || !body.effectiveFrom) {
      return NextResponse.json(
        { error: "credentialId, name, rules, and effectiveFrom are required" },
        { status: 400 }
      );
    }

    // Validate credential exists
    const credential = await prisma.credential.findUnique({
      where: { id: body.credentialId },
    });
    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // Get next version number
    const latestPack = await prisma.credentialRulePack.findFirst({
      where: { credentialId: body.credentialId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latestPack?.version ?? 0) + 1;

    // If there's a currently active pack (effectiveTo is null), close it
    if (latestPack && !latestPack.effectiveTo) {
      const newEffectiveFrom = new Date(body.effectiveFrom);
      // Previous pack's effectiveTo = day before new pack starts
      const closingDate = new Date(newEffectiveFrom);
      closingDate.setDate(closingDate.getDate() - 1);

      await prisma.credentialRulePack.update({
        where: { id: latestPack.id },
        data: { effectiveTo: closingDate },
      });
    }

    const rulesStr = typeof body.rules === "string" ? body.rules : JSON.stringify(body.rules);

    const pack = await prisma.credentialRulePack.create({
      data: {
        credentialId: body.credentialId,
        version: nextVersion,
        name: body.name,
        rules: rulesStr,
        effectiveFrom: new Date(body.effectiveFrom),
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        changelog: body.changelog || null,
      },
    });

    return NextResponse.json(
      {
        id: pack.id,
        credentialId: pack.credentialId,
        version: pack.version,
        name: pack.name,
        rules: JSON.parse(pack.rules),
        effectiveFrom: pack.effectiveFrom.toISOString(),
        effectiveTo: pack.effectiveTo?.toISOString() ?? null,
        changelog: pack.changelog,
      },
      { status: 201 }
    );
  } catch (err) {
    return serverError(err);
  }
}
