/**
 * Benchmark Snapshot API - POST /api/benchmarking/snapshot
 *
 * Admin-only endpoint that recalculates benchmark snapshots for all
 * active credentials. Rate limited to 1 request per minute.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generateBenchmarkSnapshot } from "@/lib/benchmarking";

export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "benchmark-snapshot", {
      windowMs: 60_000,
      max: 1,
    });
    if (limited) return limited;

    const session = await requireRole("admin");
    if (session instanceof NextResponse) return session;

    // Determine the current period
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const period = `${now.getFullYear()}-Q${quarter}`;

    // Get all active credentials
    const credentials = await prisma.credential.findMany({
      where: { active: true },
    });

    let snapshotsGenerated = 0;
    for (const cred of credentials) {
      // Get distinct jurisdictions for this credential
      const jurisdictions = await prisma.userCredential.findMany({
        where: { credentialId: cred.id },
        select: { jurisdiction: true },
        distinct: ["jurisdiction"],
      });

      // Generate snapshot per jurisdiction
      for (const j of jurisdictions) {
        await generateBenchmarkSnapshot(cred.id, period, j.jurisdiction);
        snapshotsGenerated++;
      }

      // Also generate an "ALL" snapshot across all jurisdictions
      await generateBenchmarkSnapshot(cred.id, period);
      snapshotsGenerated++;
    }

    return NextResponse.json({
      success: true,
      period,
      snapshotsGenerated,
      credentialsProcessed: credentials.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
