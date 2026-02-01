import { NextResponse } from "next/server";
import { requireAuth, validationError, serverError, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { updateMarketplaceListingSchema } from "@/lib/schemas";

// GET /api/marketplace/[id] - Public detail view with enrollment count
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        _count: { select: { enrollments: true } },
      },
    });

    if (!listing) {
      return apiError("Listing not found", 404);
    }

    return NextResponse.json({ listing });
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/marketplace/[id] - Update listing (provider or admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id } = await params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return apiError("Listing not found", 404);
    }

    // Only the provider who created it or an admin can update
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (listing.providerId !== session.user.id && user?.role !== "admin") {
      return apiError("Not authorized to update this listing", 403);
    }

    const body = await request.json();
    const parsed = updateMarketplaceListingSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.activityType !== undefined) updateData.activityType = data.activityType;
    if (data.hours !== undefined) updateData.hours = data.hours;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.maxEnrollment !== undefined) updateData.maxEnrollment = data.maxEnrollment;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.enrollmentDeadline !== undefined) updateData.enrollmentDeadline = data.enrollmentDeadline;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.featured !== undefined) updateData.featured = data.featured;

    if (data.credentialIds !== undefined) {
      updateData.credentialIds = data.credentialIds ? JSON.stringify(data.credentialIds) : null;
    }
    if (data.syllabus !== undefined) {
      updateData.syllabus = data.syllabus ? JSON.stringify(data.syllabus) : null;
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags ? JSON.stringify(data.tags) : null;
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { enrollments: true } },
      },
    });

    return NextResponse.json({ listing: updated });
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/marketplace/[id] - Soft-delete (set status to archived)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { id } = await params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return apiError("Listing not found", 404);
    }

    // Only the provider who created it or an admin can delete
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (listing.providerId !== session.user.id && user?.role !== "admin") {
      return apiError("Not authorized to delete this listing", 403);
    }

    await prisma.marketplaceListing.update({
      where: { id },
      data: { status: "archived" },
    });

    return NextResponse.json({ message: "Listing archived" });
  } catch (err) {
    return serverError(err);
  }
}
