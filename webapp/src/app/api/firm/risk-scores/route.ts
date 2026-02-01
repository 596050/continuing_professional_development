/**
 * Firm Risk Scores - GET /api/firm/risk-scores
 *
 * Calculates a 0-100 risk score per member, sorted highest risk first.
 * Factors include hours remaining, days until deadline, and activity trend.
 *
 * Supports ?credential=NAME filter.
 * Requires firm_admin role.
 */
import { NextResponse } from "next/server";
import { requireRole, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { getFirmComplianceSummary } from "@/lib/firm-compliance";

export async function GET(request: Request) {
  try {
    const session = await requireRole("firm_admin", "admin");
    if (session instanceof NextResponse) return session;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firmId: true },
    });

    if (!user || !user.firmId) {
      return NextResponse.json(
        { error: "No firm associated with account" },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const credentialFilter = url.searchParams.get("credential");

    const summary = await getFirmComplianceSummary(user.firmId);

    let riskScores = summary.memberDetails.map((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      riskScore: m.riskScore,
      riskLevel: m.riskLevel,
      completionPct: m.completionPct,
      daysUntilDeadline: m.daysUntilDeadline,
      lastActivityDate: m.lastActivityDate,
      credentialStatuses: m.credentialStatuses,
    }));

    // Filter by credential name if specified
    if (credentialFilter) {
      riskScores = riskScores.filter((m) =>
        m.credentialStatuses.some(
          (cs) => cs.credentialName.toLowerCase() === credentialFilter.toLowerCase()
        )
      );
    }

    // Sort by risk score descending (highest risk first)
    riskScores.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({
      firmId: user.firmId,
      totalMembers: riskScores.length,
      riskScores,
    });
  } catch (err) {
    return serverError(err);
  }
}
