import { NextResponse } from "next/server";
import { requireAuth, serverError, apiError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { checkEnrollmentEligibility } from "@/lib/marketplace";

// POST /api/marketplace/[id]/enroll - Enroll in a listing
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = withRateLimit(request, "marketplace-enroll", { windowMs: 60_000, max: 10 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id: listingId } = await params;

    // Check eligibility
    const eligibility = await checkEnrollmentEligibility(session.user.id, listingId);
    if (!eligibility.eligible) {
      return apiError(eligibility.reason ?? "Not eligible", 400);
    }

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return apiError("Listing not found", 404);
    }

    // If the listing has a price > 0, return a checkout indicator
    // In a production system this would integrate with Stripe
    if (listing.price > 0) {
      const enrollment = await prisma.marketplaceEnrollment.create({
        data: {
          listingId,
          userId: session.user.id,
          status: "enrolled",
          metadata: JSON.stringify({ pendingPayment: true }),
        },
      });

      return NextResponse.json({
        enrollment,
        requiresPayment: true,
        checkoutUrl: `/api/checkout?marketplace=${listingId}`,
      }, { status: 201 });
    }

    // Free course: create enrollment immediately
    const enrollment = await prisma.marketplaceEnrollment.create({
      data: {
        listingId,
        userId: session.user.id,
        status: "enrolled",
      },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
