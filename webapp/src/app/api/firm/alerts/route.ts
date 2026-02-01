/**
 * Firm Alerts - GET, POST, PATCH /api/firm/alerts
 *
 * GET: List alerts for the firm, with optional filters (?read=false&type=X&severity=X)
 * POST: Auto-generate alerts by scanning member compliance states
 * PATCH: Mark alerts as read or resolved
 *
 * Requires firm_admin role. POST is rate-limited.
 */
import { NextResponse } from "next/server";
import {
  requireRole,
  serverError,
  validationError,
  withRateLimit,
} from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { firmAlertsQuerySchema, firmAlertsPatchSchema } from "@/lib/schemas";
import { generateFirmAlerts } from "@/lib/firm-compliance";

// ---------------------------------------------------------------------------
// GET - List firm alerts
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
      read: url.searchParams.get("read") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      severity: url.searchParams.get("severity") ?? undefined,
    };

    const parsed = firmAlertsQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { firmId: user.firmId };
    if (parsed.data.read !== undefined) {
      where.read = parsed.data.read === "true";
    }
    if (parsed.data.type) {
      where.type = parsed.data.type;
    }
    if (parsed.data.severity) {
      where.severity = parsed.data.severity;
    }

    const alerts = await prisma.firmAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ alerts, total: alerts.length });
  } catch (err) {
    return serverError(err);
  }
}

// ---------------------------------------------------------------------------
// POST - Auto-generate alerts by scanning compliance states
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const session = await requireRole("firm_admin", "admin");
    if (session instanceof NextResponse) return session;

    const limited = withRateLimit(request, "firm-alerts-generate", {
      windowMs: 60_000,
      max: 10,
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

    const newAlerts = await generateFirmAlerts(user.firmId);

    // Create alerts in the database
    const created = [];
    for (const alert of newAlerts) {
      const record = await prisma.firmAlert.create({
        data: {
          firmId: alert.firmId,
          userId: alert.userId,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: alert.metadata,
        },
      });
      created.push(record);
    }

    return NextResponse.json({
      generated: created.length,
      alerts: created,
    });
  } catch (err) {
    return serverError(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH - Mark alerts as read or resolved
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  try {
    const session = await requireRole("firm_admin", "admin");
    if (session instanceof NextResponse) return session;

    const limited = withRateLimit(request, "firm-alerts-patch", {
      windowMs: 60_000,
      max: 30,
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

    const body = await request.json();
    const parsed = firmAlertsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (parsed.data.read !== undefined) {
      updateData.read = parsed.data.read;
    }
    if (parsed.data.resolvedAt !== undefined) {
      updateData.resolvedAt = new Date(parsed.data.resolvedAt);
    }

    // Only update alerts belonging to this firm
    const result = await prisma.firmAlert.updateMany({
      where: {
        id: { in: parsed.data.alertIds },
        firmId: user.firmId,
      },
      data: updateData,
    });

    return NextResponse.json({
      updated: result.count,
    });
  } catch (err) {
    return serverError(err);
  }
}
