import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// POST /api/activities/[id]/publish - Publish an activity (compliance approver or admin)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("admin", "firm_admin");
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { creditMappings: true },
  });

  if (!activity) {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  if (activity.publishStatus === "published") {
    return NextResponse.json(
      { error: "Activity is already published" },
      { status: 400 }
    );
  }

  // Validate minimum requirements for publishing
  if (!activity.title) {
    return NextResponse.json(
      { error: "Activity must have a title to be published" },
      { status: 400 }
    );
  }

  if (activity.creditMappings.length === 0) {
    return NextResponse.json(
      { error: "Activity must have at least one credit mapping to be published" },
      { status: 400 }
    );
  }

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      publishStatus: "published",
      publishedAt: new Date(),
      approvedBy: session.user.id,
    },
    include: { creditMappings: true },
  });

  return NextResponse.json({ activity: updated });
}
