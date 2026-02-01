/**
 * Activity Credit Resolution - GET /api/activities/[id]/credits
 *
 * This is the "credit moat" endpoint: it resolves how many CPD credits
 * a specific activity is worth FOR EACH of the user's credentials.
 *
 * WHY THIS IS COMPLEX:
 * A single webinar on "Ethics in Financial Planning" might be worth:
 *   - 1 CE hour (ethics) for a US CFP holder
 *   - 1 CPD hour (ethics) for a UK FCA adviser
 *   - 0 hours for a user in a state where it's not approved (e.g., NY)
 *   - 0.5 hours if the user holds a different credential with lower rates
 *
 * The CreditMapping table stores the mapping rules per country/credential,
 * and this endpoint evaluates ALL of them against the user's credential
 * profile to produce a "credit view" - what this activity is worth to YOU.
 *
 * RESOLUTION LOGIC:
 * 1. Fetch all active credit mappings for the activity
 * 2. For each user credential:
 *    a. Filter mappings by country (exact match OR "INTL" wildcard)
 *    b. Filter by credentialId if the mapping is credential-specific
 *    c. Check state exclusions (e.g., "not approved in NY, CA, VA")
 *    d. Check state inclusions (e.g., "only approved in TX, FL")
 *    e. Sum applicable credit amounts
 * 3. Return per-credential breakdown with eligibility status
 *
 * This powers the activity catalog's "X hours for your credential" badges.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/activities/[id]/credits - Resolve credit view for current user's profile
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

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
