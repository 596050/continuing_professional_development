import { NextResponse } from "next/server";
import { requireRole, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/firm/dashboard - firm admin dashboard data
export async function GET() {
  try {
    const session = await requireRole("firm_admin", "admin");
    if (session instanceof NextResponse) return session;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, firmId: true },
    });

    if (!user || !user.firmId) {
      return NextResponse.json({ error: "No firm associated with account" }, { status: 404 });
    }

    const firm = await prisma.firm.findUnique({
      where: { id: user.firmId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
            role: true,
            credentials: {
              where: { isPrimary: true },
              include: { credential: { select: { name: true, hoursRequired: true } } },
            },
            cpdRecords: {
              where: { status: "completed" },
              select: { hours: true },
            },
          },
        },
      },
    });

    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    const members = firm.members.map((m) => {
      const primaryCred = m.credentials[0];
      const hoursCompleted = m.cpdRecords.reduce((sum, r) => sum + r.hours, 0);
      const hoursRequired = primaryCred?.credential.hoursRequired ?? 0;
      const progressPercent = hoursRequired > 0
        ? Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100))
        : 0;

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        plan: m.plan,
        role: m.role,
        hoursCompleted,
        hoursRequired,
        progressPercent,
        credentialName: primaryCred?.credential.name ?? null,
      };
    });

    const compliantCount = members.filter((m) => m.progressPercent >= 100).length;
    const atRiskCount = members.filter((m) => m.progressPercent < 50 && m.hoursRequired > 0).length;
    const avgProgress = members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + m.progressPercent, 0) / members.length)
      : 0;

    return NextResponse.json({
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        plan: firm.plan,
        seatsLimit: firm.seatsLimit,
        active: firm.active,
        whiteLabel: firm.whiteLabel,
        customBrandName: firm.customBrandName,
      },
      members,
      stats: {
        totalMembers: members.length,
        averageProgress: avgProgress,
        compliantCount,
        atRiskCount,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
