/**
 * External Compliance Status API - GET /api/external/compliance-status
 *
 * Returns detailed compliance data for firm members.
 * Optionally filter by userId query parameter.
 * Requires API key with "read:compliance" permission.
 */
import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key-auth";

export async function GET(req: NextRequest) {
  try {
    const keyContext = await requireApiKey(req, "read:compliance");
    if (keyContext instanceof NextResponse) return keyContext;

    const { searchParams } = new URL(req.url);
    const filterUserId = searchParams.get("userId");

    const whereClause: Record<string, unknown> = {
      firmId: keyContext.firmId,
    };
    if (filterUserId) {
      whereClause.id = filterUserId;
    }

    const employees = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credentials: {
          include: {
            credential: true,
          },
        },
        cpdRecords: {
          where: { status: "completed" },
          select: {
            id: true,
            title: true,
            hours: true,
            category: true,
            activityType: true,
            date: true,
          },
        },
      },
    });

    // If filtering by userId and user is not in this firm, return empty
    if (filterUserId && employees.length === 0) {
      return NextResponse.json(
        { error: "Employee not found in this firm", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const result = employees.map((emp) => {
      const totalHours = emp.cpdRecords.reduce((s, r) => s + r.hours, 0);
      const ethicsHours = emp.cpdRecords
        .filter((r) => r.category === "ethics")
        .reduce((s, r) => s + r.hours, 0);
      const structuredHours = emp.cpdRecords
        .filter(
          (r) =>
            r.activityType === "structured" || r.activityType === "verifiable"
        )
        .reduce((s, r) => s + r.hours, 0);

      const credentialDetails = emp.credentials.map((uc) => {
        const cred = uc.credential;
        const hoursRequired = cred.hoursRequired ?? 0;
        const progressPercent =
          hoursRequired > 0
            ? Math.min(100, Math.round((totalHours / hoursRequired) * 100))
            : 0;

        return {
          credentialName: cred.name,
          body: cred.body,
          region: cred.region,
          jurisdiction: uc.jurisdiction,
          hoursRequired,
          ethicsRequired: cred.ethicsHours ?? 0,
          structuredRequired: cred.structuredHours ?? 0,
          renewalDeadline: uc.renewalDeadline?.toISOString() ?? null,
          progressPercent,
          isPrimary: uc.isPrimary,
        };
      });

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        totalHours,
        ethicsHours,
        structuredHours,
        credentials: credentialDetails,
        recentActivities: emp.cpdRecords.slice(0, 10).map((r) => ({
          id: r.id,
          title: r.title,
          hours: r.hours,
          category: r.category,
          activityType: r.activityType,
          date: r.date.toISOString(),
        })),
      };
    });

    return NextResponse.json({ employees: result });
  } catch (err) {
    return serverError(err);
  }
}
