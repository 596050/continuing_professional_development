import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import path from "path";
import fs from "fs/promises";
import {
  generateCertificatePdf,
  CertificateInfo,
} from "@/lib/pdf";

// GET /api/certificates/[id]/download - Download certificate PDF
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

  // Try to serve stored PDF
  if (certificate.pdfStorageKey) {
    const fullPath = path.join(process.cwd(), certificate.pdfStorageKey);
    try {
      const buffer = await fs.readFile(fullPath);
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${certificate.certificateCode}.pdf"`,
        },
      });
    } catch {
      // File missing, regenerate below
    }
  }

  // Regenerate PDF on the fly
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { firm: true },
  });

  const metadata = certificate.metadata
    ? JSON.parse(certificate.metadata)
    : {};

  const certInfo: CertificateInfo = {
    certificateCode: certificate.certificateCode,
    title: certificate.title,
    recipientName: user?.name ?? "",
    recipientEmail: user?.email ?? "",
    credentialName: certificate.credentialName,
    hours: certificate.hours,
    category: certificate.category,
    provider: certificate.provider,
    completedDate: certificate.completedDate.toISOString(),
    issuedDate: certificate.issuedDate.toISOString(),
    verificationUrl: certificate.verificationUrl,
    quizScore: metadata.quizScore ?? null,
    firmName: user?.firm?.customBrandName ?? user?.firm?.name ?? null,
    firmLogoUrl: user?.firm?.logoUrl ?? null,
    firmPrimaryColor: user?.firm?.primaryColor ?? null,
  };

  const pdfDoc = await generateCertificatePdf(certInfo);
  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfDoc) {
    chunks.push(chunk as Uint8Array);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.certificateCode}.pdf"`,
    },
  });
}
