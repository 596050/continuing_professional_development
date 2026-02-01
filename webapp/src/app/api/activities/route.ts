import { NextResponse } from "next/server";
import { requireAuth, requireRole, validationError, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createActivitySchema } from "@/lib/schemas";

// GET /api/activities - List activities (published for users, all for admins)
export async function GET(request: Request) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const jurisdiction = searchParams.get("jurisdiction");
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // Check if user is admin/publisher
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, firmId: true },
  });
  const isAdmin = user && ["admin", "firm_admin"].includes(user.role);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { active: true };

  // Non-admins only see published activities
  if (!isAdmin) {
    where.publishStatus = "published";
  } else if (status) {
    where.publishStatus = status;
  }

  if (type) where.type = type;
  if (jurisdiction) {
    where.jurisdictions = { contains: jurisdiction };
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        creditMappings: { where: { active: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  return NextResponse.json({ activities, total, limit, offset });
}

// POST /api/activities - Create a new activity (admin/publisher only)
export async function POST(request: Request) {
  const limited = withRateLimit(request, "activity-create", { windowMs: 60_000, max: 20 });
  if (limited) return limited;

  const session = await requireRole("admin", "firm_admin");
  if (session instanceof NextResponse) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, firmId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const {
    type,
    title,
    description,
    presenters,
    durationMinutes,
    learningObjectives,
    tags,
    jurisdictions,
    creditMappings,
  } = parsed.data;

  const { evidencePolicy, deliveryUrl, deliveryMeta, quizId } = body;

  const activity = await prisma.activity.create({
    data: {
      tenantId: user.firmId ?? null,
      type,
      title,
      description: description ?? null,
      presenters: presenters ? JSON.stringify(presenters) : null,
      durationMinutes: durationMinutes ?? null,
      learningObjectives: learningObjectives
        ? JSON.stringify(learningObjectives)
        : null,
      tags: tags ? JSON.stringify(tags) : null,
      jurisdictions: jurisdictions ? JSON.stringify(jurisdictions) : null,
      evidencePolicy: evidencePolicy ? JSON.stringify(evidencePolicy) : null,
      deliveryUrl: deliveryUrl ?? null,
      deliveryMeta: deliveryMeta ? JSON.stringify(deliveryMeta) : null,
      quizId: quizId ?? null,
      createdBy: session.user.id,
      publishStatus: "draft",
    },
  });

  // Create credit mappings if provided
  if (creditMappings && Array.isArray(creditMappings)) {
    for (const mapping of creditMappings) {
      await prisma.creditMapping.create({
        data: {
          activityId: activity.id,
          creditUnit: mapping.creditUnit ?? "hours",
          creditAmount: mapping.creditAmount,
          creditCategory: mapping.creditCategory,
          structuredFlag: mapping.structuredFlag ?? "true",
          country: mapping.country,
          stateProvince: mapping.stateProvince
            ? JSON.stringify(mapping.stateProvince)
            : null,
          exclusions: mapping.exclusions
            ? JSON.stringify(mapping.exclusions)
            : null,
          validationMethod: mapping.validationMethod ?? "attendance",
          credentialId: mapping.credentialId ?? null,
        },
      });
    }
  }

  const created = await prisma.activity.findUnique({
    where: { id: activity.id },
    include: { creditMappings: true },
  });

  return NextResponse.json({ activity: created }, { status: 201 });
}
