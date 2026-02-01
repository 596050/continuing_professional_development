import { NextResponse } from "next/server";
import { requireAuth, serverError, apiError, validationError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { autoCompleteCpdRecord } from "@/lib/marketplace";
import { enrollmentCompleteSchema } from "@/lib/schemas";

// POST /api/marketplace/[id]/complete - Mark enrollment as completed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = withRateLimit(request, "marketplace-complete", { windowMs: 60_000, max: 20 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id: listingId } = await params;

    // Parse optional body
    let notes: string | undefined;
    try {
      const body = await request.json();
      const parsed = enrollmentCompleteSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      notes = parsed.data.notes;
    } catch {
      // Empty body is fine
    }

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return apiError("Listing not found", 404);
    }

    // Find the enrollment - either the user themselves or the provider can complete it
    const enrollment = await prisma.marketplaceEnrollment.findUnique({
      where: { listingId_userId: { listingId, userId: session.user.id } },
    });

    // Check if the current user is the provider (completing on behalf of enrollee)
    let targetEnrollment = enrollment;

    if (!enrollment && listing.providerId === session.user.id) {
      // Provider completing - look for any enrollment on this listing
      // Provider needs to specify which user via query param or we complete the first enrolled
      return apiError("Provider must specify a userId to complete enrollment for", 400);
    }

    if (!targetEnrollment) {
      return apiError("Enrollment not found", 404);
    }

    if (targetEnrollment.status === "completed") {
      return apiError("Enrollment is already completed", 400);
    }

    if (targetEnrollment.status === "cancelled" || targetEnrollment.status === "refunded") {
      return apiError("Cannot complete a cancelled or refunded enrollment", 400);
    }

    // Auto-create CPD record and optional certificate
    const { cpdRecord, certificateId } = await autoCompleteCpdRecord(
      targetEnrollment,
      listing
    );

    // Update the enrollment
    const updated = await prisma.marketplaceEnrollment.update({
      where: { id: targetEnrollment.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        cpdRecordId: cpdRecord.id,
        certificateId,
        metadata: notes
          ? JSON.stringify({ ...JSON.parse(targetEnrollment.metadata ?? "{}"), completionNotes: notes })
          : targetEnrollment.metadata,
      },
    });

    return NextResponse.json({
      enrollment: updated,
      cpdRecord,
      certificateId,
    });
  } catch (err) {
    return serverError(err);
  }
}
