import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/activities/[id] - Get single activity with credit mappings
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
    where: { id, active: true },
    include: { creditMappings: { where: { active: true } } },
  });

  if (!activity) {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  // Non-admins can only see published
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isAdmin = user && ["admin", "firm_admin"].includes(user.role);
  if (!isAdmin && activity.publishStatus !== "published") {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  // Resolve credit view for this user's credential profile
  let userCreditView = null;
  const userCredential = await prisma.userCredential.findFirst({
    where: { userId: session.user.id, isPrimary: true },
    include: { credential: true },
  });

  if (userCredential) {
    const applicableMappings = activity.creditMappings.filter((m) => {
      // Match by country
      if (m.country !== userCredential.credential.region && m.country !== "INTL") {
        return false;
      }
      // Match by credential if specified
      if (m.credentialId && m.credentialId !== userCredential.credentialId) {
        return false;
      }
      // Check state exclusions for US
      if (m.exclusions && userCredential.jurisdiction) {
        const exclusions = JSON.parse(m.exclusions);
        if (exclusions.includes(userCredential.jurisdiction)) {
          return false;
        }
      }
      return true;
    });

    if (applicableMappings.length > 0) {
      userCreditView = {
        totalCredits: applicableMappings.reduce(
          (sum, m) => sum + m.creditAmount,
          0
        ),
        creditUnit: applicableMappings[0].creditUnit,
        mappings: applicableMappings,
      };
    }
  }

  return NextResponse.json({ activity, userCreditView });
}

// PATCH /api/activities/[id] - Update activity (admin/publisher only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || !["admin", "firm_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) {
    return NextResponse.json(
      { error: "Activity not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  const stringFields = ["type", "title", "description", "deliveryUrl", "quizId", "publishStatus"];
  for (const field of stringFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes;

  const jsonFields = [
    "presenters",
    "learningObjectives",
    "tags",
    "jurisdictions",
    "evidencePolicy",
    "deliveryMeta",
  ];
  for (const field of jsonFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field] ? JSON.stringify(body[field]) : null;
    }
  }

  const updated = await prisma.activity.update({
    where: { id },
    data: updateData,
    include: { creditMappings: true },
  });

  return NextResponse.json({ activity: updated });
}

// DELETE /api/activities/[id] - Soft-delete activity (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.activity.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ message: "Activity deactivated" });
}
