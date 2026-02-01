/**
 * External Employees API - GET /api/external/employees
 *
 * Returns a list of firm employees with basic compliance status.
 * Requires API key with "read:employees" permission.
 */
import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key-auth";

export async function GET(req: NextRequest) {
  try {
    const keyContext = await requireApiKey(req, "read:employees");
    if (keyContext instanceof NextResponse) return keyContext;

    const employees = await prisma.user.findMany({
      where: { firmId: keyContext.firmId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credentials: {
          where: { isPrimary: true },
          include: {
            credential: {
              select: { name: true, hoursRequired: true },
            },
          },
        },
        cpdRecords: {
          where: { status: "completed" },
          select: { hours: true },
        },
      },
    });

    const result = employees.map((emp) => {
      const primaryCred = emp.credentials[0];
      const hoursCompleted = emp.cpdRecords.reduce(
        (sum, r) => sum + r.hours,
        0
      );
      const hoursRequired = primaryCred?.credential.hoursRequired ?? 0;
      const progressPercent =
        hoursRequired > 0
          ? Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100))
          : 0;

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        credentialName: primaryCred?.credential.name ?? null,
        hoursCompleted,
        hoursRequired,
        progressPercent,
        compliant: progressPercent >= 100,
      };
    });

    return NextResponse.json({ employees: result });
  } catch (err) {
    return serverError(err);
  }
}
