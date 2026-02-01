/**
 * Benchmarking API - GET /api/benchmarking
 *
 * Returns the authenticated user's percentile rank for each credential
 * they hold, compared to peers who hold the same credential.
 */
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { getUserBenchmark } from "@/lib/benchmarking";

export async function GET() {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const userId = session.user.id;

    // Get all credentials the user holds
    const userCredentials = await prisma.userCredential.findMany({
      where: { userId },
      include: { credential: true },
    });

    if (userCredentials.length === 0) {
      return NextResponse.json({
        credentials: [],
        message: "No credentials found. Complete onboarding to see benchmarks.",
      });
    }

    const credentials = await Promise.all(
      userCredentials.map(async (uc) => {
        const benchmark = await getUserBenchmark(userId, uc.credentialId);
        if (!benchmark) return null;
        return {
          credentialName: benchmark.credentialName,
          jurisdiction: benchmark.jurisdiction,
          userHours: benchmark.userHours,
          percentile: benchmark.percentile,
          ethicsPercentile: benchmark.ethicsPercentile,
          structuredPercentile: benchmark.structuredPercentile,
          avgHours: benchmark.avgHours,
          medianHours: benchmark.medianHours,
          p25: benchmark.p25,
          p75: benchmark.p75,
          p90: benchmark.p90,
          avgEthicsHours: benchmark.avgEthicsHours,
          avgStructuredHours: benchmark.avgStructuredHours,
          totalPeers: benchmark.totalPeers,
          message: benchmark.message,
        };
      })
    );

    return NextResponse.json({
      credentials: credentials.filter(Boolean),
    });
  } catch (err) {
    return serverError(err);
  }
}
