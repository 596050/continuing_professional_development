import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, validationError, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createCpdRecordSchema, parsePagination } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const { limit, skip } = parsePagination(searchParams);

    const [records, total] = await Promise.all([
      prisma.cpdRecord.findMany({
        where: { userId: session.user.id },
        orderBy: { date: "desc" },
        take: limit,
        skip,
      }),
      prisma.cpdRecord.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        title: r.title,
        provider: r.provider,
        activityType: r.activityType,
        hours: r.hours,
        date: r.date.toISOString(),
        status: r.status,
        category: r.category,
        learningOutcome: r.learningOutcome,
        notes: r.notes,
        source: r.source,
        evidenceStrength: r.evidenceStrength,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "cpd-records-create", { windowMs: 60_000, max: 30 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const body = await req.json();
    const parsed = createCpdRecordSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    const record = await prisma.cpdRecord.create({
      data: {
        userId: session.user.id,
        title: data.title,
        provider: data.provider || null,
        activityType: data.activityType,
        hours: data.hours,
        date: data.date,
        status: data.status,
        category: data.category,
        learningOutcome: data.learningOutcome || null,
        notes: data.notes || null,
        source: "manual",
      },
    });

    return NextResponse.json({
      id: record.id,
      title: record.title,
      hours: record.hours,
      date: record.date.toISOString(),
    });
  } catch (err) {
    return serverError(err);
  }
}
