import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { parsePagination } from "@/lib/schemas";

// GET /api/marketplace/my-enrollments - User's enrollments with listing details
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.user.id };
    if (status) where.status = status;

    const [enrollments, total] = await Promise.all([
      prisma.marketplaceEnrollment.findMany({
        where,
        orderBy: { enrolledAt: "desc" },
        take: limit,
        skip,
        include: {
          listing: true,
        },
      }),
      prisma.marketplaceEnrollment.count({ where }),
    ]);

    return NextResponse.json({
      enrollments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return serverError(err);
  }
}
