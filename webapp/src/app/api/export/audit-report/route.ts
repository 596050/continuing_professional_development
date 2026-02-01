import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAuditReport } from "@/lib/pdf";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

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

    // Fetch all completed CPD records
    const records = await prisma.cpdRecord.findMany({
      where: { userId, status: "completed" },
      orderBy: { date: "desc" },
    });

    // Fetch all evidence
    const evidenceList = await prisma.evidence.findMany({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
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

    const doc = generateAuditReport(
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
      },
      records.map((r) => ({
        title: r.title,
        provider: r.provider,
        activityType: r.activityType,
        hours: r.hours,
        date: r.date.toISOString(),
        status: r.status,
        category: r.category,
      })),
      evidenceList.map((e) => ({
        fileName: e.fileName,
        fileType: e.fileType,
        uploadedAt: e.uploadedAt.toISOString(),
        cpdRecordId: e.cpdRecordId,
      }))
    );

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    return new Promise<NextResponse>((resolve) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="audit_report_${credential.name}_${new Date().toISOString().slice(0, 10)}.pdf"`,
              "Content-Length": String(pdfBuffer.length),
            },
          })
        );
      });
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
