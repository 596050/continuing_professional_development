import { NextResponse } from "next/server";
import { requireAuth, serverError, withRateLimit } from "@/lib/api-utils";

import { prisma } from "@/lib/db";

/**
 * GET /api/settings/export — GDPR data export.
 *
 * Returns a JSON file containing all user data: profile, credentials,
 * CPD records, evidence metadata, certificates, quiz attempts, reminders,
 * notifications, and onboarding submission.
 */
export async function GET(req: Request) {
  try {
    const limited = withRateLimit(req, "gdpr-export", { windowMs: 3600_000, max: 3 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;
    const userId = session.user.id;

    const [
      user,
      credentials,
      cpdRecords,
      evidence,
      certificates,
      quizAttempts,
      reminders,
      notifications,
      onboarding,
      allocations,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, emailVerified: true,
          role: true, plan: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.userCredential.findMany({
        where: { userId },
        include: { credential: { select: { name: true, body: true, region: true } } },
      }),
      prisma.cpdRecord.findMany({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.evidence.findMany({
        where: { userId },
        select: {
          id: true, fileName: true, fileType: true, fileSize: true,
          kind: true, status: true, metadata: true, extractedMetadata: true,
          uploadedAt: true, cpdRecordId: true,
        },
      }),
      prisma.certificate.findMany({ where: { userId } }),
      prisma.quizAttempt.findMany({
        where: { userId },
        include: { quiz: { select: { title: true } } },
      }),
      prisma.reminder.findMany({ where: { userId } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.onboardingSubmission.findMany({ where: { userId } }),
      prisma.cpdAllocation.findMany({
        where: { cpdRecord: { userId } },
        include: { userCredential: { select: { credential: { select: { name: true } } } } },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      format: "AuditReadyCPD GDPR Export v1",
      user,
      credentials: credentials.map((c) => ({
        credentialName: c.credential.name,
        body: c.credential.body,
        region: c.credential.region,
        jurisdiction: c.jurisdiction,
        renewalDeadline: c.renewalDeadline?.toISOString() ?? null,
        hoursCompleted: c.hoursCompleted,
        isPrimary: c.isPrimary,
      })),
      cpdRecords: cpdRecords.map((r) => ({
        ...r,
        date: r.date.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      evidence: evidence.map((e) => ({
        ...e,
        uploadedAt: e.uploadedAt.toISOString(),
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        extractedMetadata: e.extractedMetadata ? JSON.parse(e.extractedMetadata) : null,
      })),
      certificates: certificates.map((c) => ({
        ...c,
        completedDate: c.completedDate.toISOString(),
        issuedDate: c.issuedDate.toISOString(),
      })),
      quizAttempts: quizAttempts.map((a) => ({
        quizTitle: a.quiz.title,
        score: a.score,
        passed: a.passed,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt?.toISOString() ?? null,
      })),
      reminders,
      notifications: notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      onboarding,
      allocations: allocations.map((a) => ({
        cpdRecordId: a.cpdRecordId,
        credentialName: a.userCredential.credential.name,
        hours: a.hours,
      })),
    };

    const json = JSON.stringify(exportData, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="auditreadycpd-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
