import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateCertificatePdf,
  generateCertificateCode,
  CertificateInfo,
} from "@/lib/pdf";

// GET /api/certificates - List certificates for authenticated user
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId: session.user.id };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { credentialName: { contains: search } },
      { provider: { contains: search } },
      { certificateCode: { contains: search } },
    ];
  }

  const [certificates, total] = await Promise.all([
    prisma.certificate.findMany({
      where,
      orderBy: { issuedDate: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.certificate.count({ where }),
  ]);

  return NextResponse.json({ certificates, total, limit, offset });
}

// POST /api/certificates - Generate a new certificate
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { cpdRecordId, title, hours, category, activityType, provider, completedDate, quizScore } = body;

  if (!title || hours === undefined || !completedDate) {
    return NextResponse.json(
      { error: "title, hours, and completedDate are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      credentials: { where: { isPrimary: true }, include: { credential: true } },
      firm: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If cpdRecordId provided, verify ownership
  if (cpdRecordId) {
    const record = await prisma.cpdRecord.findFirst({
      where: { id: cpdRecordId, userId: session.user.id },
    });
    if (!record) {
      return NextResponse.json(
        { error: "CPD record not found or not owned by user" },
        { status: 404 }
      );
    }
  }

  const certificateCode = generateCertificateCode();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const verificationUrl = `${baseUrl}/api/certificates/verify/${certificateCode}`;

  const primaryCredential = user.credentials[0]?.credential;

  const certificate = await prisma.certificate.create({
    data: {
      userId: session.user.id,
      certificateCode,
      title,
      credentialName: primaryCredential?.name ?? null,
      hours: parseFloat(String(hours)),
      category: category ?? null,
      activityType: activityType ?? null,
      provider: provider ?? null,
      completedDate: new Date(completedDate),
      verificationUrl,
      cpdRecordId: cpdRecordId ?? null,
      metadata: quizScore !== undefined ? JSON.stringify({ quizScore }) : null,
    },
  });

  // Generate PDF
  const certInfo: CertificateInfo = {
    certificateCode: certificate.certificateCode,
    title: certificate.title,
    recipientName: user.name ?? "",
    recipientEmail: user.email,
    credentialName: certificate.credentialName,
    hours: certificate.hours,
    category: certificate.category,
    provider: certificate.provider,
    completedDate: certificate.completedDate.toISOString(),
    issuedDate: certificate.issuedDate.toISOString(),
    verificationUrl: certificate.verificationUrl,
    quizScore: quizScore ?? null,
    firmName: user.firm?.customBrandName ?? user.firm?.name ?? null,
    firmLogoUrl: user.firm?.logoUrl ?? null,
    firmPrimaryColor: user.firm?.primaryColor ?? null,
  };

  const pdfDoc = await generateCertificatePdf(certInfo);

  // Collect PDF into buffer for storage
  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfDoc) {
    chunks.push(chunk as Uint8Array);
  }
  const pdfBuffer = Buffer.concat(chunks);

  // Store PDF to local filesystem
  const fs = await import("fs/promises");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "uploads", "certificates");
  await fs.mkdir(uploadDir, { recursive: true });
  const pdfPath = path.join(uploadDir, `${certificateCode}.pdf`);
  await fs.writeFile(pdfPath, pdfBuffer);

  // Update certificate with storage key
  await prisma.certificate.update({
    where: { id: certificate.id },
    data: { pdfStorageKey: `uploads/certificates/${certificateCode}.pdf` },
  });

  return NextResponse.json({
    certificate: {
      ...certificate,
      pdfStorageKey: `uploads/certificates/${certificateCode}.pdf`,
    },
  }, { status: 201 });
}
