import { NextResponse } from "next/server";
import { requireAuth, requireRole, validationError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createQuizSchema } from "@/lib/schemas";

// GET /api/quizzes - List available quizzes
export async function GET(request: Request) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const credentialId = searchParams.get("credentialId");
  const category = searchParams.get("category");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { active: true };
  if (credentialId) where.credentialId = credentialId;
  if (category) where.category = category;

  const quizzes = await prisma.quiz.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      credentialId: true,
      activityType: true,
      passMark: true,
      maxAttempts: true,
      timeLimit: true,
      hours: true,
      category: true,
      active: true,
      createdAt: true,
      _count: { select: { attempts: { where: { userId: session.user.id } } } },
    },
  });

  // Add user's attempt info
  const quizzesWithAttempts = await Promise.all(
    quizzes.map(async (quiz) => {
      const userAttempts = await prisma.quizAttempt.findMany({
        where: { userId: session.user!.id, quizId: quiz.id },
        orderBy: { startedAt: "desc" },
        select: { score: true, passed: true, startedAt: true },
      });

      const questionsJson = await prisma.quiz.findUnique({
        where: { id: quiz.id },
        select: { questionsJson: true },
      });
      const questions = JSON.parse(questionsJson?.questionsJson ?? "[]");

      return {
        ...quiz,
        questionCount: questions.length,
        userAttempts: userAttempts.length,
        bestScore: userAttempts.length > 0
          ? Math.max(...userAttempts.map((a) => a.score))
          : null,
        hasPassed: userAttempts.some((a) => a.passed),
        attemptsRemaining: quiz.maxAttempts - userAttempts.length,
      };
    })
  );

  return NextResponse.json({ quizzes: quizzesWithAttempts });
}

// POST /api/quizzes - Create a new quiz (admin only)
export async function POST(request: Request) {
  const limited = withRateLimit(request, "quiz-create", { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  const session = await requireRole("admin", "firm_admin");
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsed = createQuizSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const {
    title,
    description,
    credentialId,
    activityType,
    passMark,
    maxAttempts,
    timeLimit,
    hours,
    category,
    questions,
  } = parsed.data;

  const quiz = await prisma.quiz.create({
    data: {
      title,
      description: description ?? null,
      credentialId: credentialId ?? null,
      activityType: activityType ?? null,
      passMark: passMark ?? 70,
      maxAttempts: maxAttempts ?? 3,
      timeLimit: timeLimit ?? null,
      hours: hours ?? 0,
      category: category ?? null,
      questionsJson: JSON.stringify(questions),
    },
  });

  return NextResponse.json({ quiz }, { status: 201 });
}
