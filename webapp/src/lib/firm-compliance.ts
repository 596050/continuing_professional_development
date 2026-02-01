/**
 * Firm Compliance Risk Scoring Utilities
 *
 * Provides risk score calculation, alert generation, and aggregated
 * compliance summaries for firm-level oversight of member CPD status.
 */

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemberRiskDetail {
  userId: string;
  name: string | null;
  email: string;
  completionPct: number;
  riskScore: number;
  riskLevel: "compliant" | "on_track" | "at_risk" | "overdue";
  credentialStatuses: CredentialStatus[];
  lastActivityDate: string | null;
  daysUntilDeadline: number | null;
}

export interface CredentialStatus {
  credentialId: string;
  credentialName: string;
  hoursRequired: number;
  hoursCompleted: number;
  completionPct: number;
  renewalDeadline: string | null;
  daysUntilDeadline: number | null;
}

export interface FirmComplianceSummary {
  totalMembers: number;
  compliantCount: number;
  atRiskCount: number;
  overdueCount: number;
  avgCompletionPct: number;
  memberDetails: MemberRiskDetail[];
  credentialBreakdown: CredentialBreakdownItem[];
}

export interface CredentialBreakdownItem {
  credentialName: string;
  totalHolders: number;
  compliantCount: number;
  atRiskCount: number;
  overdueCount: number;
  avgCompletionPct: number;
}

export interface GeneratedAlert {
  firmId: string;
  userId: string | null;
  type: string;
  severity: string;
  title: string;
  message: string;
  metadata: string | null;
}

// ---------------------------------------------------------------------------
// Risk score calculation (0-100, where 100 = highest risk)
// ---------------------------------------------------------------------------

export function calculateMemberRiskScore(
  hoursCompleted: number,
  hoursRequired: number,
  daysUntilDeadline: number | null,
  lastActivityDaysAgo: number | null
): number {
  if (hoursRequired <= 0) return 0;

  const completionRatio = Math.min(hoursCompleted / hoursRequired, 1);

  // Base risk from completion gap (0-50 points)
  const completionRisk = (1 - completionRatio) * 50;

  // Deadline urgency risk (0-35 points)
  let deadlineRisk = 0;
  if (daysUntilDeadline !== null) {
    if (daysUntilDeadline < 0) {
      // Past deadline
      deadlineRisk = 35;
    } else if (daysUntilDeadline <= 7) {
      deadlineRisk = 30;
    } else if (daysUntilDeadline <= 30) {
      deadlineRisk = 25;
    } else if (daysUntilDeadline <= 60) {
      deadlineRisk = 15;
    } else if (daysUntilDeadline <= 90) {
      deadlineRisk = 8;
    } else {
      deadlineRisk = 0;
    }
    // Scale deadline risk by how incomplete they are
    deadlineRisk = deadlineRisk * (1 - completionRatio);
  }

  // Inactivity risk (0-15 points)
  let inactivityRisk = 0;
  if (lastActivityDaysAgo !== null && completionRatio < 1) {
    if (lastActivityDaysAgo > 60) {
      inactivityRisk = 15;
    } else if (lastActivityDaysAgo > 30) {
      inactivityRisk = 10;
    } else if (lastActivityDaysAgo > 14) {
      inactivityRisk = 5;
    }
  }

  const total = Math.round(completionRisk + deadlineRisk + inactivityRisk);
  return Math.min(100, Math.max(0, total));
}

// ---------------------------------------------------------------------------
// Determine risk level based on completion and deadline
// ---------------------------------------------------------------------------

export function determineRiskLevel(
  completionPct: number,
  daysUntilDeadline: number | null,
  hoursRequired: number
): "compliant" | "on_track" | "at_risk" | "overdue" {
  if (hoursRequired <= 0) return "compliant";

  // Overdue: deadline has passed and not compliant
  if (daysUntilDeadline !== null && daysUntilDeadline < 0 && completionPct < 100) {
    return "overdue";
  }

  // Compliant: met requirements
  if (completionPct >= 100) {
    return "compliant";
  }

  // At risk: less than 50% done with less than 60 days, or less than 30% done
  if (
    (daysUntilDeadline !== null && daysUntilDeadline <= 60 && completionPct < 50) ||
    completionPct < 30
  ) {
    return "at_risk";
  }

  return "on_track";
}

// ---------------------------------------------------------------------------
// Get compliance summary for a firm
// ---------------------------------------------------------------------------

export async function getFirmComplianceSummary(firmId: string): Promise<FirmComplianceSummary> {
  const now = new Date();

  // Fetch all members with their credentials and CPD records
  const members = await prisma.user.findMany({
    where: { firmId },
    select: {
      id: true,
      name: true,
      email: true,
      credentials: {
        include: {
          credential: {
            select: {
              id: true,
              name: true,
              hoursRequired: true,
              ethicsHours: true,
              structuredHours: true,
            },
          },
        },
      },
      cpdRecords: {
        where: { status: "completed" },
        select: { hours: true, date: true, category: true, activityType: true },
        orderBy: { date: "desc" },
      },
    },
  });

  const credentialMap = new Map<string, {
    name: string;
    holders: number;
    compliant: number;
    atRisk: number;
    overdue: number;
    totalPct: number;
  }>();

  const memberDetails: MemberRiskDetail[] = [];

  for (const member of members) {
    const totalLoggedHours = member.cpdRecords.reduce((s, r) => s + r.hours, 0);
    const lastActivity = member.cpdRecords.length > 0 ? member.cpdRecords[0].date : null;
    const lastActivityDaysAgo = lastActivity
      ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const credentialStatuses: CredentialStatus[] = [];
    let bestCompletionPct = 0;
    let nearestDeadlineDays: number | null = null;

    // Calculate per-credential status using the primary credential
    const primaryCred = member.credentials.find((uc) => uc.isPrimary);
    const relevantCreds = primaryCred ? [primaryCred] : member.credentials.slice(0, 1);

    for (const uc of member.credentials) {
      const cred = uc.credential;
      const hoursRequired = cred.hoursRequired ?? 0;
      const hoursCompleted = totalLoggedHours + (uc.hoursCompleted ?? 0);
      const completionPct = hoursRequired > 0
        ? Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100))
        : 100;
      const deadline = uc.renewalDeadline;
      const daysUntil = deadline
        ? Math.ceil((new Date(deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      credentialStatuses.push({
        credentialId: cred.id,
        credentialName: cred.name,
        hoursRequired,
        hoursCompleted,
        completionPct,
        renewalDeadline: deadline ? deadline.toISOString() : null,
        daysUntilDeadline: daysUntil,
      });

      // Track credential breakdown
      const existing = credentialMap.get(cred.name);
      const riskLevel = determineRiskLevel(completionPct, daysUntil, hoursRequired);
      if (existing) {
        existing.holders++;
        existing.totalPct += completionPct;
        if (riskLevel === "compliant") existing.compliant++;
        else if (riskLevel === "at_risk") existing.atRisk++;
        else if (riskLevel === "overdue") existing.overdue++;
      } else {
        credentialMap.set(cred.name, {
          name: cred.name,
          holders: 1,
          compliant: riskLevel === "compliant" ? 1 : 0,
          atRisk: riskLevel === "at_risk" ? 1 : 0,
          overdue: riskLevel === "overdue" ? 1 : 0,
          totalPct: completionPct,
        });
      }
    }

    // Use the primary credential for overall member status
    const primaryStatus = relevantCreds.length > 0 ? (() => {
      const uc = relevantCreds[0];
      const hoursRequired = uc.credential.hoursRequired ?? 0;
      const hoursCompleted = totalLoggedHours + (uc.hoursCompleted ?? 0);
      const completionPct = hoursRequired > 0
        ? Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100))
        : 100;
      const daysUntil = uc.renewalDeadline
        ? Math.ceil((new Date(uc.renewalDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return { completionPct, daysUntil, hoursRequired };
    })() : { completionPct: 0, daysUntil: null as number | null, hoursRequired: 0 };

    bestCompletionPct = primaryStatus.completionPct;
    nearestDeadlineDays = primaryStatus.daysUntil;

    const riskLevel = determineRiskLevel(bestCompletionPct, nearestDeadlineDays, primaryStatus.hoursRequired);
    const riskScore = calculateMemberRiskScore(
      bestCompletionPct / 100 * (primaryStatus.hoursRequired || 1), // convert pct back to hours
      primaryStatus.hoursRequired || 1,
      nearestDeadlineDays,
      lastActivityDaysAgo
    );

    memberDetails.push({
      userId: member.id,
      name: member.name,
      email: member.email,
      completionPct: bestCompletionPct,
      riskScore,
      riskLevel,
      credentialStatuses,
      lastActivityDate: lastActivity ? lastActivity.toISOString() : null,
      daysUntilDeadline: nearestDeadlineDays,
    });
  }

  const compliantCount = memberDetails.filter((m) => m.riskLevel === "compliant").length;
  const atRiskCount = memberDetails.filter((m) => m.riskLevel === "at_risk").length;
  const overdueCount = memberDetails.filter((m) => m.riskLevel === "overdue").length;
  const avgCompletionPct = memberDetails.length > 0
    ? Math.round(memberDetails.reduce((s, m) => s + m.completionPct, 0) / memberDetails.length)
    : 0;

  const credentialBreakdown: CredentialBreakdownItem[] = [];
  for (const [, value] of credentialMap) {
    credentialBreakdown.push({
      credentialName: value.name,
      totalHolders: value.holders,
      compliantCount: value.compliant,
      atRiskCount: value.atRisk,
      overdueCount: value.overdue,
      avgCompletionPct: value.holders > 0 ? Math.round(value.totalPct / value.holders) : 0,
    });
  }

  return {
    totalMembers: memberDetails.length,
    compliantCount,
    atRiskCount,
    overdueCount,
    avgCompletionPct,
    memberDetails,
    credentialBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Generate firm alerts by scanning all member compliance states
// ---------------------------------------------------------------------------

export async function generateFirmAlerts(firmId: string): Promise<GeneratedAlert[]> {
  const now = new Date();
  const alerts: GeneratedAlert[] = [];

  const members = await prisma.user.findMany({
    where: { firmId },
    select: {
      id: true,
      name: true,
      email: true,
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
        select: { hours: true, date: true },
        orderBy: { date: "desc" },
      },
    },
  });

  for (const member of members) {
    const primaryCred = member.credentials[0];
    if (!primaryCred) continue;

    const hoursRequired = primaryCred.credential.hoursRequired ?? 0;
    if (hoursRequired <= 0) continue;

    const totalLogged = member.cpdRecords.reduce((s, r) => s + r.hours, 0);
    const hoursCompleted = totalLogged + (primaryCred.hoursCompleted ?? 0);
    const completionPct = Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100));
    const deadline = primaryCred.renewalDeadline;
    const daysUntil = deadline
      ? Math.ceil((new Date(deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const lastActivity = member.cpdRecords.length > 0 ? member.cpdRecords[0].date : null;
    const lastActivityDaysAgo = lastActivity
      ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const memberLabel = member.name || member.email;

    // Alert: close deadline with low completion
    if (daysUntil !== null && daysUntil <= 30 && daysUntil > 0 && completionPct < 50) {
      alerts.push({
        firmId,
        userId: member.id,
        type: "compliance_risk",
        severity: daysUntil <= 7 ? "critical" : "high",
        title: `${memberLabel} at risk - ${daysUntil} days until deadline`,
        message: `${memberLabel} has only ${completionPct}% completion for ${primaryCred.credential.name} with ${daysUntil} days remaining.`,
        metadata: JSON.stringify({
          completionPct,
          daysUntilDeadline: daysUntil,
          credentialName: primaryCred.credential.name,
        }),
      });
    }

    // Alert: no activity in 30+ days (only for non-compliant members)
    if (lastActivityDaysAgo !== null && lastActivityDaysAgo >= 30 && completionPct < 100) {
      alerts.push({
        firmId,
        userId: member.id,
        type: "member_overdue",
        severity: lastActivityDaysAgo >= 60 ? "high" : "medium",
        title: `${memberLabel} inactive for ${lastActivityDaysAgo} days`,
        message: `${memberLabel} has not logged any CPD activity in ${lastActivityDaysAgo} days. Current progress: ${completionPct}%.`,
        metadata: JSON.stringify({
          lastActivityDaysAgo,
          completionPct,
          credentialName: primaryCred.credential.name,
        }),
      });
    }

    // Alert: overdue (past deadline and not compliant)
    if (daysUntil !== null && daysUntil < 0 && completionPct < 100) {
      alerts.push({
        firmId,
        userId: member.id,
        type: "deadline_approaching",
        severity: "critical",
        title: `${memberLabel} is past deadline for ${primaryCred.credential.name}`,
        message: `${memberLabel} has missed the renewal deadline by ${Math.abs(daysUntil)} days with only ${completionPct}% completion.`,
        metadata: JSON.stringify({
          completionPct,
          daysOverdue: Math.abs(daysUntil),
          credentialName: primaryCred.credential.name,
        }),
      });
    }
  }

  return alerts;
}
