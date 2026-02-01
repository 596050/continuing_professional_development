import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/certificates/[id] - Get single certificate
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const certificate = await prisma.certificate.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!certificate) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ certificate });
}

// PATCH /api/certificates/[id] - Update certificate status (revoke)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const certificate = await prisma.certificate.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!certificate) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { status } = body;

  if (status && !["active", "revoked"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be active or revoked" },
      { status: 400 }
    );
  }

  const updated = await prisma.certificate.update({
    where: { id },
    data: { status: status ?? certificate.status },
  });

  return NextResponse.json({ certificate: updated });
}
