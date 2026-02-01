import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generateComplianceBrief } from "@/lib/pdf";

export async function GET() {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const userId = session.user.id;

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        plan: true,
        credentials: { include: { credential: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const primaryUserCred = user.credentials.find((uc) => uc.isPrimary);
    if (!primaryUserCred?.credential) {
      return NextResponse.json(
        { error: "No credential configured. Complete onboarding first." },
        { status: 400 }
      );
    }

    const credential = primaryUserCred.credential;

    // Calculate progress
    const records = await prisma.cpdRecord.findMany({
      where: { userId, status: "completed" },
    });

    const totalLogged = records.reduce((s, r) => s + r.hours, 0);
    const ethicsLogged = records
      .filter((r) => r.category === "ethics")
      .reduce((s, r) => s + r.hours, 0);
    const structuredLogged = records
      .filter(
        (r) =>
          r.activityType === "structured" || r.activityType === "verifiable"
      )
      .reduce((s, r) => s + r.hours, 0);

    const onboardingHours = primaryUserCred.hoursCompleted ?? 0;
    const totalCompleted = totalLogged + onboardingHours;
    const hoursRequired = credential.hoursRequired ?? 0;

    const certificateCount = await prisma.evidence.count({
      where: { userId },
    });

    const renewalDeadline = primaryUserCred.renewalDeadline;
    const daysUntilDeadline = renewalDeadline
      ? Math.ceil(
          (new Date(renewalDeadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const doc = generateComplianceBrief(
      { name: user.name ?? "", email: user.email, plan: user.plan },
      {
        name: credential.name,
        body: credential.body,
        region: credential.region,
        hoursRequired,
        ethicsRequired: credential.ethicsHours ?? 0,
        structuredRequired: credential.structuredHours ?? 0,
        cycleLengthYears: credential.cycleLengthYears,
      },
      {
        totalHoursCompleted: totalCompleted,
        hoursRequired,
        ethicsHoursCompleted: ethicsLogged,
        ethicsRequired: credential.ethicsHours ?? 0,
        structuredHoursCompleted: structuredLogged,
        structuredRequired: credential.structuredHours ?? 0,
        progressPercent:
          hoursRequired > 0
            ? Math.min(100, Math.round((totalCompleted / hoursRequired) * 100))
            : 0,
        certificateCount,
      },
      {
        renewalDeadline: renewalDeadline?.toISOString() ?? null,
        daysUntilDeadline,
        jurisdiction: primaryUserCred.jurisdiction,
      }
    );

    // Collect PDF chunks
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    return new Promise<NextResponse>((resolve) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="compliance_brief_${credential.name}_${new Date().toISOString().slice(0, 10)}.pdf"`,
              "Content-Length": String(pdfBuffer.length),
            },
          })
        );
      });
    });
  } catch (err) {
    return serverError(err);
  }
}
