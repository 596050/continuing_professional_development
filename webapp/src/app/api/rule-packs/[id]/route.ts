import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// GET /api/rule-packs/[id] - get single rule pack
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

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
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/rule-packs/[id] - update a rule pack (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin");
    if (session instanceof NextResponse) return session;

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
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/rule-packs/[id] - delete a rule pack (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin");
    if (session instanceof NextResponse) return session;

    const { id } = await params;

    const pack = await prisma.credentialRulePack.findUnique({ where: { id } });
    if (!pack) {
      return NextResponse.json({ error: "Rule pack not found" }, { status: 404 });
    }

    await prisma.credentialRulePack.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
