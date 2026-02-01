/**
 * Firm Compliance Dashboard - GET /api/firm/compliance-dashboard
 *
 * Provides a comprehensive compliance overview for firm admins,
 * including per-member completion status, risk levels, and
 * credential-level breakdowns.
 *
 * Requires firm_admin role.
 */
import { NextResponse } from "next/server";
import { requireRole, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { getFirmComplianceSummary } from "@/lib/firm-compliance";

export async function GET() {
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

    const summary = await getFirmComplianceSummary(user.firmId);

    return NextResponse.json(summary);
  } catch (err) {
    return serverError(err);
  }
}
