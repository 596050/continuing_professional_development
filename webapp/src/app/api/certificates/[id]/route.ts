import { NextResponse } from "next/server";
import { requireAuth, validationError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { updateCertificateSchema } from "@/lib/schemas";

// GET /api/certificates/[id] - Get single certificate
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

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
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

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
  const parsed = updateCertificateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const { status } = parsed.data;

  const updated = await prisma.certificate.update({
    where: { id },
    data: { status: status ?? certificate.status },
  });

  return NextResponse.json({ certificate: updated });
}

// DELETE /api/certificates/[id] - Revoke and soft-delete a certificate
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

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

  // Soft-delete: revoke the certificate rather than hard-deleting
  // because certificates are regulatory audit evidence
  const revoked = await prisma.certificate.update({
    where: { id },
    data: { status: "revoked" },
  });

  return NextResponse.json({ deleted: true, id: revoked.id, status: "revoked" });
}
