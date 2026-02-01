import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/activities/[id]/credits - Resolve credit view for current user's profile
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const activity = await prisma.activity.findFirst({
    where: { id, active: true, publishStatus: "published" },
    include: { creditMappings: { where: { active: true } } },
  });

  if (!activity) {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  // Get all user credentials
  const userCredentials = await prisma.userCredential.findMany({
    where: { userId: session.user.id },
    include: { credential: true },
  });

  if (userCredentials.length === 0) {
    return NextResponse.json({
      activityId: activity.id,
      title: activity.title,
      creditViews: [],
      message: "No credentials on file. Complete onboarding to see applicable credits.",
    });
  }

  // Resolve credits per credential
  const creditViews = userCredentials.map((uc) => {
    const applicableMappings = activity.creditMappings.filter((m) => {
      // Match by country or INTL
      if (m.country !== uc.credential.region && m.country !== "INTL") {
        return false;
      }
      // Match by credential if specified
      if (m.credentialId && m.credentialId !== uc.credentialId) {
        return false;
      }
      // Check state exclusions
      if (m.exclusions && uc.jurisdiction) {
        try {
          const exclusions = JSON.parse(m.exclusions);
          if (exclusions.includes(uc.jurisdiction)) return false;
        } catch {
          // Invalid exclusions JSON, skip check
        }
      }
      // Check state inclusion
      if (m.stateProvince && uc.jurisdiction) {
        try {
          const states = JSON.parse(m.stateProvince);
          if (states.length > 0 && !states.includes(uc.jurisdiction)) {
            return false;
          }
        } catch {
          // Invalid stateProvince JSON, skip check
        }
      }
      return true;
    });

    return {
      credentialName: uc.credential.name,
      credentialId: uc.credentialId,
      jurisdiction: uc.jurisdiction,
      isPrimary: uc.isPrimary,
      eligible: applicableMappings.length > 0,
      totalCredits: applicableMappings.reduce(
        (sum, m) => sum + m.creditAmount,
        0
      ),
      creditUnit: applicableMappings[0]?.creditUnit ?? "hours",
      categories: applicableMappings.map((m) => ({
        category: m.creditCategory,
        amount: m.creditAmount,
        structured: m.structuredFlag,
        validationMethod: m.validationMethod,
      })),
    };
  });

  return NextResponse.json({
    activityId: activity.id,
    title: activity.title,
    creditViews,
  });
}
