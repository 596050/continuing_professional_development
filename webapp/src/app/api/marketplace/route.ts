import { NextResponse } from "next/server";
import { requireAuth, validationError, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createMarketplaceListingSchema, marketplaceSearchSchema } from "@/lib/schemas";

// GET /api/marketplace - Public listing search (only published listings)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const queryObj: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      queryObj[key] = value;
    }

    const parsed = marketplaceSearchSchema.safeParse(queryObj);
    if (!parsed.success) return validationError(parsed.error);

    const { category, activityType, credential, minHours, maxPrice, search, page, limit, sort } = parsed.data;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: "published" };

    if (category) where.category = category;
    if (activityType) where.activityType = activityType;
    if (credential) {
      where.credentialIds = { contains: credential };
    }
    if (minHours !== undefined) {
      where.hours = { ...(where.hours || {}), gte: minHours };
    }
    if (maxPrice !== undefined) {
      where.price = { ...(where.price || {}), lte: maxPrice };
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Determine ordering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    else if (sort === "price_desc") orderBy = { price: "desc" };
    // "popular" sorts by enrollment count - we handle this after query

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        orderBy,
        take: limit,
        skip,
        include: {
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    // For "popular" sort, re-sort by enrollment count
    if (sort === "popular") {
      listings.sort((a, b) => b._count.enrollments - a._count.enrollments);
    }

    return NextResponse.json({
      listings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/marketplace - Create a new listing (requires auth)
export async function POST(request: Request) {
  try {
    const limited = withRateLimit(request, "marketplace-create", { windowMs: 60_000, max: 10 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const parsed = createMarketplaceListingSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    const listing = await prisma.marketplaceListing.create({
      data: {
        providerId: session.user.id,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        activityType: data.activityType,
        hours: data.hours,
        price: data.price ?? 0,
        currency: data.currency ?? "USD",
        credentialIds: data.credentialIds ? JSON.stringify(data.credentialIds) : null,
        maxEnrollment: data.maxEnrollment ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        enrollmentDeadline: data.enrollmentDeadline ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        syllabus: data.syllabus ? JSON.stringify(data.syllabus) : null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        status: "draft",
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
