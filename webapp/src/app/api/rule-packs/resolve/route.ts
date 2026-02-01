import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/rule-packs/resolve?credentialId=xxx&date=2026-01-15
// Returns the rule pack that was effective for a given credential on a given date.
// If no date is provided, returns the currently active pack.
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get("credentialId");
    const dateStr = searchParams.get("date");

    if (!credentialId) {
      return NextResponse.json({ error: "credentialId is required" }, { status: 400 });
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();

    // Find the rule pack where effectiveFrom <= targetDate
    // AND (effectiveTo >= targetDate OR effectiveTo is null)
    const packs = await prisma.credentialRulePack.findMany({
      where: {
        credentialId,
        effectiveFrom: { lte: targetDate },
      },
      orderBy: { effectiveFrom: "desc" },
      include: { credential: { select: { name: true, body: true, region: true } } },
    });

    // Filter: effectiveTo must be null or >= targetDate
    const matching = packs.find(
      (p) => !p.effectiveTo || p.effectiveTo >= targetDate
    );

    if (!matching) {
      // Fallback: return the credential's built-in rules from the Credential model
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
      });

      if (!credential) {
        return NextResponse.json({ error: "Credential not found" }, { status: 404 });
      }

      return NextResponse.json({
        resolved: true,
        source: "credential_defaults",
        credentialId: credential.id,
        credentialName: credential.name,
        date: targetDate.toISOString(),
        rules: {
          hoursRequired: credential.hoursRequired,
          ethicsHours: credential.ethicsHours,
          structuredHours: credential.structuredHours,
          cycleLengthYears: credential.cycleLengthYears,
          categoryRules: credential.categoryRules ? JSON.parse(credential.categoryRules) : null,
        },
        version: null,
        packId: null,
      });
    }

    return NextResponse.json({
      resolved: true,
      source: "rule_pack",
      credentialId: matching.credentialId,
      credentialName: matching.credential.name,
      date: targetDate.toISOString(),
      rules: JSON.parse(matching.rules),
      version: matching.version,
      packId: matching.id,
      packName: matching.name,
      effectiveFrom: matching.effectiveFrom.toISOString(),
      effectiveTo: matching.effectiveTo?.toISOString() ?? null,
    });
  } catch (err) {
    return serverError(err);
  }
}
