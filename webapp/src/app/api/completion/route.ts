import { NextResponse } from "next/server";
import { requireAuth, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { evaluateCompletionRules } from "@/lib/completion";
import { generateCertificateCode } from "@/lib/pdf";

// GET /api/completion?cpdRecordId=xxx - Check completion status for a CPD record
export async function GET(request: Request) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const cpdRecordId = searchParams.get("cpdRecordId");

  if (!cpdRecordId) {
    return NextResponse.json(
      { error: "cpdRecordId query parameter is required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const record = await prisma.cpdRecord.findFirst({
    where: { id: cpdRecordId, userId: session.user.id },
  });
  if (!record) {
    return NextResponse.json(
      { error: "CPD record not found" },
      { status: 404 }
    );
  }

  const result = await evaluateCompletionRules(session.user.id, cpdRecordId);

  return NextResponse.json(result);
}

// POST /api/completion - Trigger certificate generation if all rules pass
export async function POST(request: Request) {
  const limited = withRateLimit(request, "completion-create", { windowMs: 60_000, max: 20 });
  if (limited) return limited;

  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const { cpdRecordId } = body;

  if (!cpdRecordId) {
    return NextResponse.json(
      { error: "cpdRecordId is required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const record = await prisma.cpdRecord.findFirst({
    where: { id: cpdRecordId, userId: session.user.id },
  });
  if (!record) {
    return NextResponse.json(
      { error: "CPD record not found" },
      { status: 404 }
    );
  }

  const result = await evaluateCompletionRules(session.user.id, cpdRecordId);

  if (!result.allPassed) {
    return NextResponse.json({
      ...result,
      message: "Not all completion rules are met. Certificate not generated.",
    });
  }

  // Check if certificate already exists for this record
  const existing = await prisma.certificate.findFirst({
    where: { cpdRecordId, userId: session.user.id, status: "active" },
  });
  if (existing) {
    return NextResponse.json({
      ...result,
      message: "Certificate already exists for this activity.",
      certificate: {
        id: existing.id,
        certificateCode: existing.certificateCode,
        verificationUrl: existing.verificationUrl,
      },
    });
  }

  // Generate certificate
  const userCredential = await prisma.userCredential.findFirst({
    where: { userId: session.user.id, isPrimary: true },
    include: { credential: true },
  });

  const certificateCode = generateCertificateCode();
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const verificationUrl = `${baseUrl}/api/certificates/verify/${certificateCode}`;

  const certificate = await prisma.certificate.create({
    data: {
      userId: session.user.id,
      certificateCode,
      title: record.title,
      credentialName: userCredential?.credential?.name ?? null,
      hours: record.hours,
      category: record.category,
      activityType: record.activityType,
      provider: record.provider,
      completedDate: record.date,
      verificationUrl,
      cpdRecordId: record.id,
      metadata: JSON.stringify({
        completionRules: result.rules.map((r) => ({
          name: r.ruleName,
          type: r.ruleType,
          passed: r.passed,
        })),
      }),
    },
  });

  return NextResponse.json({
    ...result,
    message: "All rules passed. Certificate generated.",
    certificate: {
      id: certificate.id,
      certificateCode: certificate.certificateCode,
      verificationUrl: certificate.verificationUrl,
    },
  }, { status: 201 });
}
