import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/certificates/verify/[code] - Public certificate verification
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { certificateCode: code },
    include: {
      user: { select: { name: true } },
    },
  });

  if (!certificate) {
    return NextResponse.json(
      {
        valid: false,
        error: "Certificate not found. This code does not match any issued certificate.",
      },
      { status: 404 }
    );
  }

  if (certificate.status === "revoked") {
    return NextResponse.json({
      valid: false,
      certificateCode: certificate.certificateCode,
      status: "revoked",
      message: "This certificate has been revoked.",
      issuedDate: certificate.issuedDate.toISOString(),
    });
  }

  return NextResponse.json({
    valid: true,
    certificateCode: certificate.certificateCode,
    status: certificate.status,
    title: certificate.title,
    recipientName: certificate.user?.name ?? "Verified recipient",
    hours: certificate.hours,
    category: certificate.category,
    credentialName: certificate.credentialName,
    provider: certificate.provider,
    completedDate: certificate.completedDate.toISOString(),
    issuedDate: certificate.issuedDate.toISOString(),
  });
}
