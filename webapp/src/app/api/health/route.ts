import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health — liveness/readiness probe for load balancers.
 *
 * Returns 200 with { status: "ok", db: "ok" } if the database is reachable.
 * Returns 503 if the database is unreachable.
 */
export async function GET() {
  try {
    // Verify database connectivity
    await prisma.$queryRawUnsafe("SELECT 1");

    return NextResponse.json({
      status: "ok",
      db: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        db: "unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
