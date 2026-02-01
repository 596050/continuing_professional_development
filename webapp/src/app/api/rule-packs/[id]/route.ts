import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/rule-packs/[id] - get single rule pack
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;

    const pack = await prisma.credentialRulePack.findUnique({
      where: { id },
      include: { credential: { select: { name: true, body: true, region: true } } },
    });

    if (!pack) {
      return NextResponse.json({ error: "Rule pack not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: pack.id,
      credentialId: pack.credentialId,
      credentialName: pack.credential.name,
      version: pack.version,
      name: pack.name,
      rules: JSON.parse(pack.rules),
      effectiveFrom: pack.effectiveFrom.toISOString(),
      effectiveTo: pack.effectiveTo?.toISOString() ?? null,
      changelog: pack.changelog,
      createdAt: pack.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/rule-packs/[id] - update a rule pack (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const pack = await prisma.credentialRulePack.findUnique({ where: { id } });
    if (!pack) {
      return NextResponse.json({ error: "Rule pack not found" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.changelog !== undefined) updates.changelog = body.changelog;
    if (body.effectiveTo !== undefined) {
      updates.effectiveTo = body.effectiveTo ? new Date(body.effectiveTo) : null;
    }
    if (body.rules !== undefined) {
      updates.rules = typeof body.rules === "string" ? body.rules : JSON.stringify(body.rules);
    }

    const updated = await prisma.credentialRulePack.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      id: updated.id,
      version: updated.version,
      name: updated.name,
      rules: JSON.parse(updated.rules),
      effectiveFrom: updated.effectiveFrom.toISOString(),
      effectiveTo: updated.effectiveTo?.toISOString() ?? null,
      changelog: updated.changelog,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/rule-packs/[id] - delete a rule pack (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const pack = await prisma.credentialRulePack.findUnique({ where: { id } });
    if (!pack) {
      return NextResponse.json({ error: "Rule pack not found" }, { status: 404 });
    }

    await prisma.credentialRulePack.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
