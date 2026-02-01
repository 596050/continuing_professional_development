import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// Map onboarding credential labels to database credential names
const CREDENTIAL_MAP: Record<string, string> = {
  "CFP (Certified Financial Planner)": "CFP",
  "QAFP (Qualified Associate Financial Planner)": "FP Canada QAFP",
  "IAR (Investment Adviser Representative)": "IAR",
  "Series 6 / 7 / 63 / 65 / 66 (FINRA)": "FINRA Series",
  "UK FCA Adviser (Retail Investment)": "FCA Adviser",
  "CII / PFS Member": "CII/PFS",
  "CISI Member": "CISI",
  "FASEA (Australia)": "FASEA/ASIC",
  "FP Canada - CFP or QAFP": "FP Canada CFP",
  "MAS Licensed Rep (Singapore)": "MAS Licensed Rep",
  "SFC Licensed Rep (Hong Kong)": "SFC Licensed Rep",
};

// Map jurisdiction labels to region codes
const JURISDICTION_MAP: Record<string, string> = {
  "United States - select state below": "US",
  "United Kingdom": "GB",
  "Australia": "AU",
  "Canada": "CA",
  "Singapore": "SG",
  "Hong Kong": "HK",
  "European Union": "EU",
};

export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "onboarding", { windowMs: 60_000, max: 5 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const data = await req.json();

    const submission = await prisma.onboardingSubmission.upsert({
      where: { userId: session.user.id },
      update: {
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        primaryCredential: data.credential,
        additionalCredentials: JSON.stringify(data.additionalCredentials || []),
        jurisdiction: data.jurisdiction,
        renewalDeadline: data.renewalDeadline,
        currentHoursCompleted: data.currentHoursCompleted,
        preferredLearningFormat: JSON.stringify(data.preferredLearningFormat || []),
        biggestPainPoint: data.biggestPainPoint,
        status: "pending",
      },
      create: {
        userId: session.user.id,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        primaryCredential: data.credential,
        additionalCredentials: JSON.stringify(data.additionalCredentials || []),
        jurisdiction: data.jurisdiction,
        renewalDeadline: data.renewalDeadline,
        currentHoursCompleted: data.currentHoursCompleted,
        preferredLearningFormat: JSON.stringify(data.preferredLearningFormat || []),
        biggestPainPoint: data.biggestPainPoint,
        status: "pending",
      },
    });

    // Update user name if provided
    if (data.fullName) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: data.fullName },
      });
    }

    // Create UserCredential record for primary credential
    const credentialName = CREDENTIAL_MAP[data.credential];
    if (credentialName) {
      const credential = await prisma.credential.findUnique({
        where: { name: credentialName },
      });

      if (credential) {
        const jurisdiction = JURISDICTION_MAP[data.jurisdiction] || data.jurisdiction || "US";
        const renewalDeadline = data.renewalDeadline
          ? new Date(data.renewalDeadline)
          : null;
        const hoursCompleted = parseFloat(data.currentHoursCompleted) || 0;

        await prisma.userCredential.upsert({
          where: {
            userId_credentialId: {
              userId: session.user.id,
              credentialId: credential.id,
            },
          },
          update: {
            jurisdiction,
            renewalDeadline,
            hoursCompleted,
            isPrimary: true,
          },
          create: {
            userId: session.user.id,
            credentialId: credential.id,
            jurisdiction,
            renewalDeadline,
            hoursCompleted,
            isPrimary: true,
          },
        });
      }
    }

    return NextResponse.json({ id: submission.id, status: submission.status });
  } catch (err) {
    return serverError(err);
  }
}
