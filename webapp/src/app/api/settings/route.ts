import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/settings - Get user profile & credentials
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      planActivatedAt: true,
      createdAt: true,
      credentials: {
        include: { credential: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      planActivatedAt: user.planActivatedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    credentials: user.credentials.map((uc) => ({
      id: uc.id,
      credentialId: uc.credentialId,
      name: uc.credential.name,
      body: uc.credential.body,
      region: uc.credential.region,
      jurisdiction: uc.jurisdiction,
      renewalDeadline: uc.renewalDeadline?.toISOString() ?? null,
      hoursCompleted: uc.hoursCompleted,
      hoursRequired: uc.credential.hoursRequired,
      isPrimary: uc.isPrimary,
    })),
  });
}

// PATCH /api/settings - Update user profile
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;

  // Password change
  if (body.currentPassword && body.newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Password change not available for this account" },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    updates.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
    select: { name: true, email: true },
  });

  return NextResponse.json({ user: updated });
}
