import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

interface GapRecommendation {
  category: string;
  hoursNeeded: number;
  urgency: "critical" | "high" | "medium" | "low";
  message: string;
  credentialName?: string;
  credentialId?: string;
  suggestedActivities: {
    id: string;
    title: string;
    type: string;
    hours: number;
    category: string;
    provider?: string;
    matchScore: number;
  }[];
}

export async function GET() {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const userId = session.user.id;

    // Fetch user with all credentials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        credentials: {
          include: { credential: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const primaryUserCred = user.credentials.find((uc) => uc.isPrimary);
    const credential = primaryUserCred?.credential;

    if (!credential) {
      return NextResponse.json({
        recommendations: [],
        summary: { compliant: false, message: "No credential configured. Complete onboarding to get recommendations." },
      });
    }

    // Get completed CPD records
    const cpdRecords = await prisma.cpdRecord.findMany({
      where: { userId, status: "completed" },
    });

    // Fetch published activities (shared across all credentials)
    const activities = await prisma.activity.findMany({
      where: { active: true, publishStatus: "published" },
      include: { creditMappings: { where: { active: true } } },
      take: 100,
    });

    // Collect all user credential IDs for quiz matching
    const allUserCredentialIds = new Set(user.credentials.map((uc) => uc.credentialId));

    // Build recommendations across ALL credentials (Feature 2A: Multi-Credential Support)
    const allRecommendations: GapRecommendation[] = [];
    const credentialBreakdowns: Array<{
      credentialName: string;
      credentialId: string;
      totalNeeded: number;
      ethicsNeeded: number;
      structuredNeeded: number;
      daysUntilDeadline: number | null;
      compliant: boolean;
    }> = [];

    // We iterate all credentials but use the primary as the "main" credential for backward compatibility
    const credsToProcess = user.credentials;

    for (const uc of credsToProcess) {
      const cred = uc.credential;

      const totalCompleted = cpdRecords.reduce((s, r) => s + r.hours, 0) + (uc.hoursCompleted ?? 0);
      const ethicsCompleted = cpdRecords.filter((r) => r.category === "ethics").reduce((s, r) => s + r.hours, 0);
      const structuredCompleted = cpdRecords
        .filter((r) => r.activityType === "structured" || r.activityType === "verifiable")
        .reduce((s, r) => s + r.hours, 0);

      const totalNeeded = Math.max(0, (cred.hoursRequired ?? 0) - totalCompleted);
      const ethicsNeeded = Math.max(0, (cred.ethicsHours ?? 0) - ethicsCompleted);
      const structuredNeeded = Math.max(0, (cred.structuredHours ?? 0) - structuredCompleted);

      const renewalDeadline = uc.renewalDeadline;
      const daysUntilDeadline = renewalDeadline
        ? Math.ceil((new Date(renewalDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      const isCompliant = totalNeeded <= 0 && ethicsNeeded <= 0 && structuredNeeded <= 0;

      credentialBreakdowns.push({
        credentialName: cred.name,
        credentialId: cred.id,
        totalNeeded: Math.round(totalNeeded * 100) / 100,
        ethicsNeeded: Math.round(ethicsNeeded * 100) / 100,
        structuredNeeded: Math.round(structuredNeeded * 100) / 100,
        daysUntilDeadline,
        compliant: isCompliant,
      });

      function getUrgency(hoursNeeded: number): "critical" | "high" | "medium" | "low" {
        if (hoursNeeded <= 0) return "low";
        if (daysUntilDeadline !== null && daysUntilDeadline < 30) return "critical";
        if (daysUntilDeadline !== null && daysUntilDeadline < 90) return "high";
        return "medium";
      }

      // Feature 2B: Deadline-aware activity scoring
      function scoreActivity(activity: typeof activities[0], targetCategory?: string) {
        let score = 0;
        const mappings = activity.creditMappings;

        for (const m of mappings) {
          if (m.credentialId === cred.id) score += 10;
          if (m.country === cred.region) score += 5;
          if (m.country === "INTL") score += 2;
          if (targetCategory && m.creditCategory === targetCategory) score += 8;
        }

        // Boost quizzes (they're structured/verifiable)
        if (activity.quizId) score += 3;

        // Deadline multiplier: boost activities with higher credit hours when deadline is closer
        if (daysUntilDeadline !== null && score > 0) {
          if (daysUntilDeadline < 30) {
            score = Math.round(score * 1.5);
          } else if (daysUntilDeadline < 60) {
            score = Math.round(score * 1.2);
          } else if (daysUntilDeadline < 90) {
            score = Math.round(score * 1.1);
          }
        }

        return score;
      }

      // Ethics gap
      if (ethicsNeeded > 0) {
        const ethicsActivities = activities
          .map((a) => ({
            ...a,
            matchScore: scoreActivity(a, "ethics"),
          }))
          .filter((a) => a.matchScore > 0 || a.creditMappings.some((m) => m.creditCategory === "ethics"))
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5);

        allRecommendations.push({
          category: "ethics",
          hoursNeeded: ethicsNeeded,
          urgency: getUrgency(ethicsNeeded),
          credentialName: cred.name,
          credentialId: cred.id,
          message: `You need ${ethicsNeeded} more ethics hour${ethicsNeeded !== 1 ? "s" : ""} to meet your ${cred.name} requirement.`,
          suggestedActivities: ethicsActivities.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            hours: a.durationMinutes ? a.durationMinutes / 60 : 0,
            category: "ethics",
            matchScore: a.matchScore,
          })),
        });
      }

      // Structured gap
      if (structuredNeeded > 0) {
        const structuredActivities = activities
          .map((a) => ({
            ...a,
            matchScore: scoreActivity(a, "technical"),
          }))
          .filter((a) => a.matchScore > 0 || a.creditMappings.some((m) => m.structuredFlag === "true"))
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5);

        allRecommendations.push({
          category: "structured",
          hoursNeeded: structuredNeeded,
          urgency: getUrgency(structuredNeeded),
          credentialName: cred.name,
          credentialId: cred.id,
          message: `You need ${structuredNeeded} more structured hour${structuredNeeded !== 1 ? "s" : ""} for your ${cred.name} credential.`,
          suggestedActivities: structuredActivities.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            hours: a.durationMinutes ? a.durationMinutes / 60 : 0,
            category: "structured",
            matchScore: a.matchScore,
          })),
        });
      }

      // Total hours gap (general)
      const generalNeeded = Math.max(0, totalNeeded - ethicsNeeded - structuredNeeded);
      if (generalNeeded > 0) {
        const generalActivities = activities
          .map((a) => ({
            ...a,
            matchScore: scoreActivity(a),
          }))
          .filter((a) => a.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5);

        allRecommendations.push({
          category: "general",
          hoursNeeded: generalNeeded,
          urgency: getUrgency(generalNeeded),
          credentialName: cred.name,
          credentialId: cred.id,
          message: `You need ${generalNeeded} more general CPD hour${generalNeeded !== 1 ? "s" : ""} to complete your ${cred.name} cycle.`,
          suggestedActivities: generalActivities.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            hours: a.durationMinutes ? a.durationMinutes / 60 : 0,
            category: "general",
            matchScore: a.matchScore,
          })),
        });
      }
    }

    // Feature 2C: Quizzes with enhanced info and matchScore
    // Fetch quizzes that match any of the user's credentials (or have no credential filter)
    const credentialIds = user.credentials.map((uc) => uc.credentialId);
    const availableQuizzes = await prisma.quiz.findMany({
      where: {
        active: true,
        OR: [
          { credentialId: { in: credentialIds } },
          { credentialId: null },
        ],
      },
    });

    const userQuizAttempts = await prisma.quizAttempt.findMany({
      where: { userId, passed: true },
      select: { quizId: true },
    });
    const passedQuizIds = new Set(userQuizAttempts.map((a) => a.quizId));

    const uncompletedQuizzes = availableQuizzes
      .filter((q) => !passedQuizIds.has(q.id))
      .map((q) => {
        // Calculate matchScore based on credential match
        let matchScore = 0;
        if (q.credentialId && allUserCredentialIds.has(q.credentialId)) {
          matchScore = 10;
        } else if (!q.credentialId) {
          matchScore = 2; // Generic quiz, mild match
        }

        return {
          id: q.id,
          title: q.title,
          hours: q.hours,
          category: q.category ?? "general",
          passMark: q.passMark,
          activityType: q.activityType ?? undefined,
          description: q.description ?? undefined,
          matchScore,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    // Primary credential summary (backward compatible)
    const primaryBreakdown = credentialBreakdowns.find((b) => b.credentialId === credential.id);
    const primaryTotalNeeded = primaryBreakdown?.totalNeeded ?? 0;
    const primaryEthicsNeeded = primaryBreakdown?.ethicsNeeded ?? 0;
    const primaryStructuredNeeded = primaryBreakdown?.structuredNeeded ?? 0;
    const primaryDaysUntilDeadline = primaryBreakdown?.daysUntilDeadline ?? null;
    const primaryCompliant = primaryBreakdown?.compliant ?? false;

    function getPrimaryUrgency(hoursNeeded: number): "critical" | "high" | "medium" | "low" {
      if (hoursNeeded <= 0) return "low";
      if (primaryDaysUntilDeadline !== null && primaryDaysUntilDeadline < 30) return "critical";
      if (primaryDaysUntilDeadline !== null && primaryDaysUntilDeadline < 90) return "high";
      return "medium";
    }

    let summaryMessage: string;
    if (primaryCompliant) {
      summaryMessage = `You have met all ${credential.name} CPD requirements for this cycle. Keep up the good work!`;
    } else if (primaryDaysUntilDeadline !== null && primaryDaysUntilDeadline < 30) {
      summaryMessage = `Urgent: Your ${credential.name} deadline is in ${primaryDaysUntilDeadline} days. You still need ${primaryTotalNeeded} hours to be compliant.`;
    } else {
      summaryMessage = `You need ${primaryTotalNeeded} more hours total to meet your ${credential.name} requirements.`;
    }

    return NextResponse.json({
      recommendations: allRecommendations,
      quizzes: uncompletedQuizzes,
      summary: {
        compliant: primaryCompliant,
        totalNeeded: Math.round(primaryTotalNeeded * 100) / 100,
        ethicsNeeded: Math.round(primaryEthicsNeeded * 100) / 100,
        structuredNeeded: Math.round(primaryStructuredNeeded * 100) / 100,
        daysUntilDeadline: primaryDaysUntilDeadline,
        urgency: getPrimaryUrgency(primaryTotalNeeded),
        message: summaryMessage,
        credentialBreakdowns,
      },
      credential: {
        name: credential.name,
        hoursRequired: credential.hoursRequired,
        ethicsRequired: credential.ethicsHours ?? 0,
        structuredRequired: credential.structuredHours ?? 0,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
