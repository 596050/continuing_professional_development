import { NextRequest, NextResponse } from "next/server";
import { requireRole, serverError } from "@/lib/api-utils";
import { scanDeadlines, processPendingReminders } from "@/lib/deadline-scanner";

/**
 * POST /api/cron/reminders - Trigger deadline scanning and reminder delivery.
 *
 * Can be called by:
 * - Vercel Cron (via CRON_SECRET header)
 * - Admin user (via session auth)
 * - External scheduler (via CRON_SECRET header)
 *
 * Runs two phases:
 * 1. Scan deadlines and create new reminders
 * 2. Process pending reminders (send emails)
 */
export async function POST(req: NextRequest) {
  try {
    // Auth: either CRON_SECRET header or admin role
    const cronSecret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
    const expectedSecret = process.env.CRON_SECRET;

    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      // Authenticated via cron secret
    } else {
      // Fall back to admin role check
      const session = await requireRole("admin");
      if (session instanceof NextResponse) return session;
    }

    // Phase 1: Scan deadlines
    const scanResult = await scanDeadlines();

    // Phase 2: Process pending reminders
    const pendingResult = await processPendingReminders();

    return NextResponse.json({
      success: true,
      scan: scanResult,
      pending: pendingResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return serverError(err);
  }
}
