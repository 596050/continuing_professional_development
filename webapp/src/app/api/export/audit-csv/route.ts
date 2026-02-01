import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generateAuditCsv } from "@/lib/pdf";

export async function GET() {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

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

    const records = await prisma.cpdRecord.findMany({
      where: { userId, status: "completed" },
      orderBy: { date: "desc" },
    });

    const csv = generateAuditCsv(
      { name: user.name ?? "", email: user.email, plan: user.plan },
      {
        name: credential.name,
        body: credential.body,
        region: credential.region,
        hoursRequired: credential.hoursRequired ?? 0,
        ethicsRequired: credential.ethicsHours ?? 0,
        structuredRequired: credential.structuredHours ?? 0,
        cycleLengthYears: credential.cycleLengthYears,
      },
      records.map((r) => ({
        title: r.title,
        provider: r.provider,
        activityType: r.activityType,
        hours: r.hours,
        date: r.date.toISOString(),
        status: r.status,
        category: r.category,
      }))
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cpd_records_${credential.name}_${new Date().toISOString().slice(0, 10)}.csv"`,
        "Content-Length": String(Buffer.byteLength(csv, "utf-8")),
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
