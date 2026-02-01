/**
 * Firm Compliance Snapshot - GET, POST /api/firm/compliance-snapshot
 *
 * POST: Takes a snapshot of the current compliance state for historical tracking
 * GET: Returns snapshots for time-series charting (?from=DATE&to=DATE)
 *
 * Requires firm_admin role. POST is rate-limited to 5/min.
 */
import { NextResponse } from "next/server";
import {
  requireRole,
  serverError,
  validationError,
  withRateLimit,
} from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { complianceSnapshotQuerySchema } from "@/lib/schemas";
import { getFirmComplianceSummary } from "@/lib/firm-compliance";

// ---------------------------------------------------------------------------
// GET - Retrieve historical snapshots for charting
// ---------------------------------------------------------------------------
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
    const queryParams = {
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    };

    const parsed = complianceSnapshotQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    // Build date filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { firmId: user.firmId };
    if (parsed.data.from || parsed.data.to) {
      where.snapshotDate = {};
      if (parsed.data.from) {
        where.snapshotDate.gte = new Date(parsed.data.from);
      }
      if (parsed.data.to) {
        where.snapshotDate.lte = new Date(parsed.data.to);
      }
    }

    const snapshots = await prisma.firmComplianceSnapshot.findMany({
      where,
      orderBy: { snapshotDate: "asc" },
    });

    return NextResponse.json({
      snapshots,
      total: snapshots.length,
    });
  } catch (err) {
    return serverError(err);
  }
}

// ---------------------------------------------------------------------------
// POST - Create a snapshot of current compliance state
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const session = await requireRole("firm_admin", "admin");
    if (session instanceof NextResponse) return session;

    const limited = withRateLimit(request, "firm-compliance-snapshot", {
      windowMs: 60_000,
      max: 5,
    });
    if (limited) return limited;

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

    // Get current compliance state
    const summary = await getFirmComplianceSummary(user.firmId);

    // Create the snapshot
    const snapshot = await prisma.firmComplianceSnapshot.create({
      data: {
        firmId: user.firmId,
        totalMembers: summary.totalMembers,
        compliantCount: summary.compliantCount,
        atRiskCount: summary.atRiskCount,
        overdueCount: summary.overdueCount,
        avgCompletionPct: summary.avgCompletionPct,
        breakdown: JSON.stringify(summary.credentialBreakdown),
      },
    });

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
