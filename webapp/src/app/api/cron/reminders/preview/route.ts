import { NextResponse } from "next/server";
import { requireRole, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

/**
 * GET /api/cron/reminders/preview - Preview upcoming deadline reminders
 * without actually sending them. Admin only.
 */
export async function GET() {
  try {
    const session = await requireRole("admin");
    if (session instanceof NextResponse) return session;

    const userCredentials = await prisma.userCredential.findMany({
      where: { renewalDeadline: { not: null } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        credential: { select: { name: true, hoursRequired: true } },
      },
    });

    const now = new Date();
    const thresholds = [90, 60, 30, 7];

    const preview = [];

    for (const uc of userCredentials) {
      if (!uc.renewalDeadline) continue;
      const deadline = new Date(uc.renewalDeadline);
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0 || daysUntil > 90) continue;

      const threshold = thresholds.find((t) => daysUntil <= t);
      if (!threshold) continue;

      // Check if already sent
      const existing = await prisma.reminder.findFirst({
        where: {
          userId: uc.userId,
          credentialId: uc.credentialId,
          type: "deadline",
          metadata: { contains: `"threshold":${threshold}` },
        },
      });

      preview.push({
        userId: uc.userId,
        userName: uc.user.name,
        email: uc.user.email,
        credential: uc.credential.name,
        deadline: deadline.toISOString().split("T")[0],
        daysUntil,
        threshold,
        alreadySent: !!existing,
        wouldSend: !existing,
      });
    }

    return NextResponse.json({
      preview: preview.sort((a, b) => a.daysUntil - b.daysUntil),
      totalUsers: preview.length,
      wouldSend: preview.filter((p) => p.wouldSend).length,
      alreadySent: preview.filter((p) => p.alreadySent).length,
    });
  } catch (err) {
    return serverError(err);
  }
}
