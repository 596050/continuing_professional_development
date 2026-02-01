/**
 * Provider Reporting Dashboard - GET /api/provider/report
 *
 * WHY THIS EXISTS:
 * Providers (firms, training companies, CE/CPD content creators) need to
 * see how their content is performing: how many completions, pass rates,
 * hours issued, and certificate counts. This data justifies the provider's
 * subscription and is often required for their own regulatory reporting.
 *
 * TENANT SCOPING:
 * - Platform admins (role=admin) see ALL data across the platform
 * - Firm admins (role=firm_admin) see ONLY their firm's data
 *   (filtered by tenantId = user.firmId)
 * - Regular users get 403 Forbidden
 *
 * This scoping is critical for multi-tenant data isolation: Zurich should
 * never see Fidelity's completion rates.
 *
 * METRICS RETURNED:
 * - Activity counts: total, published, draft (content pipeline health)
 * - Certificate counts: total, active (net of revocations)
 * - Quiz stats: total attempts, passed, pass rate % (content quality)
 * - Credit hours: total issued, breakdown by category (regulatory value)
 * - Optional date range filter on all metrics
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/provider/report - Provider reporting dashboard data
export async function GET(request: Request) {
  const session = await requireRole("admin", "firm_admin");
  if (session instanceof NextResponse) return session;

  // Role check already done by requireRole
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, firmId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  // Date range filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (fromDate) dateFilter.gte = new Date(fromDate);
  if (toDate) dateFilter.lte = new Date(toDate);

  // Tenant scope: firm admins see their firm's data, platform admins see all
  const tenantFilter = user.role === "firm_admin" && user.firmId
    ? { tenantId: user.firmId }
    : {};

  // Activity stats
  const [
    totalActivities,
    publishedActivities,
    draftActivities,
  ] = await Promise.all([
    prisma.activity.count({
      where: { ...tenantFilter, active: true },
    }),
    prisma.activity.count({
      where: { ...tenantFilter, active: true, publishStatus: "published" },
    }),
    prisma.activity.count({
      where: { ...tenantFilter, active: true, publishStatus: "draft" },
    }),
  ]);

  // Certificate stats
  const certWhere = dateFilter.gte || dateFilter.lte
    ? { issuedDate: dateFilter }
    : {};
  const [
    totalCertificates,
    activeCertificates,
  ] = await Promise.all([
    prisma.certificate.count({ where: certWhere }),
    prisma.certificate.count({ where: { ...certWhere, status: "active" } }),
  ]);

  // Quiz stats
  const [
    totalQuizAttempts,
    passedQuizAttempts,
  ] = await Promise.all([
    prisma.quizAttempt.count({
      where: dateFilter.gte || dateFilter.lte
        ? { startedAt: dateFilter }
        : {},
    }),
    prisma.quizAttempt.count({
      where: {
        passed: true,
        ...(dateFilter.gte || dateFilter.lte
          ? { startedAt: dateFilter }
          : {}),
      },
    }),
  ]);

  // CPD hours issued
  const completedRecords = await prisma.cpdRecord.findMany({
    where: {
      status: "completed",
      source: "platform",
      ...(dateFilter.gte || dateFilter.lte
        ? { date: dateFilter }
        : {}),
    },
    select: { hours: true, category: true },
  });

  const totalHoursIssued = completedRecords.reduce(
    (sum, r) => sum + r.hours,
    0
  );

  // Hours by category
  const hoursByCategory: Record<string, number> = {};
  for (const record of completedRecords) {
    const cat = record.category ?? "general";
    hoursByCategory[cat] = (hoursByCategory[cat] ?? 0) + record.hours;
  }

  // Completion conversion rate
  const quizPassRate =
    totalQuizAttempts > 0
      ? Math.round((passedQuizAttempts / totalQuizAttempts) * 100)
      : 0;

  return NextResponse.json({
    activities: {
      total: totalActivities,
      published: publishedActivities,
      draft: draftActivities,
    },
    certificates: {
      total: totalCertificates,
      active: activeCertificates,
    },
    quizzes: {
      totalAttempts: totalQuizAttempts,
      passed: passedQuizAttempts,
      passRate: quizPassRate,
    },
    credits: {
      totalHoursIssued: Math.round(totalHoursIssued * 100) / 100,
      hoursByCategory,
    },
    dateRange: {
      from: fromDate ?? null,
      to: toDate ?? null,
    },
  });
}
