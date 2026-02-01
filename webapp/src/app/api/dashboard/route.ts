/**
 * Dashboard API - GET /api/dashboard
 *
 * The primary data endpoint for the authenticated user's dashboard view.
 * Aggregates data from multiple tables into a single response that the
 * frontend renders without needing multiple requests.
 *
 * BUSINESS LOGIC:
 * - Hours calculation includes BOTH logged CPD records AND self-reported
 *   hours from onboarding (UserCredential.hoursCompleted). This handles
 *   the common case where an adviser has existing hours before joining.
 * - Progress percentage is capped at 100% even if the user exceeds the
 *   requirement (over-compliance is common in regulated professions).
 * - Only "completed" status records count toward hour totals. Records in
 *   "planned" or "in_progress" states are shown in the activity feed but
 *   do not contribute to compliance calculations.
 * - Ethics and structured hours are tracked separately because most
 *   credentials have sub-requirements (e.g., CFP: 2h ethics of 30h total).
 * - Deadline calculation uses server time to avoid timezone discrepancies.
 *
 * DATA FLOW:
 *   User -> UserCredential (primary) -> Credential (requirements)
 *   User -> CpdRecord[] (completed) -> hour aggregation
 *   User -> Evidence (count) -> certificate count
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user with credentials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        credentials: {
          include: {
            credential: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch CPD records
    const cpdRecords = await prisma.cpdRecord.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 50,
    });

    // Find primary credential
    const primaryUserCred = user.credentials.find((uc) => uc.isPrimary);
    const credential = primaryUserCred?.credential;

    // Calculate hours by category
    const completedRecords = cpdRecords.filter(
      (r) => r.status === "completed"
    );
    const totalHoursCompleted = completedRecords.reduce(
      (sum, r) => sum + r.hours,
      0
    );
    const ethicsHoursCompleted = completedRecords
      .filter((r) => r.category === "ethics")
      .reduce((sum, r) => sum + r.hours, 0);
    const structuredHoursCompleted = completedRecords
      .filter(
        (r) =>
          r.activityType === "structured" || r.activityType === "verifiable"
      )
      .reduce((sum, r) => sum + r.hours, 0);

    // Get requirements from credential
    const hoursRequired = credential?.hoursRequired ?? 0;
    const ethicsRequired = credential?.ethicsHours ?? 0;
    const structuredRequired = credential?.structuredHours ?? 0;

    // Add self-reported hours from onboarding to total
    const onboardingHours = primaryUserCred?.hoursCompleted ?? 0;
    const effectiveTotalCompleted = totalHoursCompleted + onboardingHours;

    // Calculate deadlines
    const renewalDeadline = primaryUserCred?.renewalDeadline;
    const daysUntilDeadline = renewalDeadline
      ? Math.ceil(
          (new Date(renewalDeadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    // Count certificates (records with evidence)
    const certificateCount = await prisma.evidence.count({
      where: { userId },
    });

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
      },
      credential: credential
        ? {
            name: credential.name,
            body: credential.body,
            region: credential.region,
            hoursRequired,
            ethicsRequired,
            structuredRequired,
            cycleLengthYears: credential.cycleLengthYears,
            categoryRules: credential.categoryRules
              ? JSON.parse(credential.categoryRules)
              : null,
          }
        : null,
      progress: {
        totalHoursCompleted: effectiveTotalCompleted,
        hoursRequired,
        ethicsHoursCompleted,
        ethicsRequired,
        structuredHoursCompleted,
        structuredRequired,
        progressPercent:
          hoursRequired > 0
            ? Math.min(
                100,
                Math.round((effectiveTotalCompleted / hoursRequired) * 100)
              )
            : 0,
        certificateCount,
      },
      deadline: {
        renewalDeadline: renewalDeadline?.toISOString() ?? null,
        daysUntilDeadline,
        jurisdiction: primaryUserCred?.jurisdiction ?? null,
      },
      activities: cpdRecords.map((r) => ({
        id: r.id,
        title: r.title,
        provider: r.provider,
        activityType: r.activityType,
        hours: r.hours,
        date: r.date.toISOString(),
        status: r.status,
        category: r.category,
        source: r.source,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
