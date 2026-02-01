/**
 * Marketplace utility functions for enrollment eligibility checks
 * and auto-completing CPD records from marketplace courses.
 */

import { prisma } from "@/lib/db";
import { generateCertificateCode } from "@/lib/pdf";

interface ListingData {
  id: string;
  title: string;
  hours: number;
  category: string;
  activityType: string;
  credentialIds: string | null;
  providerId: string;
}

interface EnrollmentData {
  id: string;
  listingId: string;
  userId: string;
}

/**
 * Auto-creates a CpdRecord (and optionally a Certificate) when a
 * marketplace enrollment is marked as completed.
 */
export async function autoCompleteCpdRecord(
  enrollment: EnrollmentData,
  listing: ListingData
) {
  // Map marketplace activityType to CpdRecord activityType
  const activityTypeMap: Record<string, string> = {
    webinar: "structured",
    course: "structured",
    workshop: "structured",
    self_study: "unstructured",
    conference: "structured",
  };

  const cpdRecord = await prisma.cpdRecord.create({
    data: {
      userId: enrollment.userId,
      title: listing.title,
      provider: "Marketplace",
      activityType: activityTypeMap[listing.activityType] ?? "structured",
      hours: listing.hours,
      date: new Date(),
      status: "completed",
      category: listing.category,
      source: "platform",
      notes: `Auto-logged from marketplace listing: ${listing.id}`,
    },
  });

  let certificateId: string | null = null;

  // Auto-generate certificate if the listing is linked to credentials
  if (listing.credentialIds) {
    let credIds: string[] = [];
    try {
      credIds = JSON.parse(listing.credentialIds);
    } catch {
      // not valid JSON, skip certificate
    }

    if (credIds.length > 0) {
      // Look up first matching credential for the user
      const userCred = await prisma.userCredential.findFirst({
        where: {
          userId: enrollment.userId,
          credentialId: { in: credIds },
        },
        include: { credential: true },
      });

      const credentialName = userCred?.credential?.name ?? null;
      const certCode = generateCertificateCode();
      const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
      const verificationUrl = `${baseUrl}/api/certificates/verify/${certCode}`;

      const certificate = await prisma.certificate.create({
        data: {
          userId: enrollment.userId,
          certificateCode: certCode,
          title: listing.title,
          credentialName,
          hours: listing.hours,
          category: listing.category,
          activityType: activityTypeMap[listing.activityType] ?? "structured",
          provider: "Marketplace",
          completedDate: new Date(),
          verificationUrl,
          cpdRecordId: cpdRecord.id,
        },
      });

      certificateId = certificate.id;
    }
  }

  return { cpdRecord, certificateId };
}

/**
 * Checks whether a user is eligible to enroll in a marketplace listing.
 * Returns { eligible: true } or { eligible: false, reason: string }.
 */
export async function checkEnrollmentEligibility(
  userId: string,
  listingId: string
): Promise<{ eligible: boolean; reason?: string }> {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      _count: { select: { enrollments: true } },
    },
  });

  if (!listing) {
    return { eligible: false, reason: "Listing not found" };
  }

  if (listing.status !== "published") {
    return { eligible: false, reason: "Listing is not available for enrollment" };
  }

  // Check if already enrolled
  const existing = await prisma.marketplaceEnrollment.findUnique({
    where: { listingId_userId: { listingId, userId } },
  });

  if (existing) {
    return { eligible: false, reason: "Already enrolled in this listing" };
  }

  // Check capacity
  if (listing.maxEnrollment !== null && listing._count.enrollments >= listing.maxEnrollment) {
    return { eligible: false, reason: "Enrollment is full" };
  }

  // Check enrollment deadline
  if (listing.enrollmentDeadline && new Date() > listing.enrollmentDeadline) {
    return { eligible: false, reason: "Enrollment deadline has passed" };
  }

  return { eligible: true };
}
