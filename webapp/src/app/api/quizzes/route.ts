import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/quizzes - List available quizzes
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        where: { userId: session.user.id, quizId: quiz.id },
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || !["admin", "firm_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
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
  } = body;

  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: "title and questions array are required" },
      { status: 400 }
    );
  }

  // Validate question format
  for (const q of questions) {
    if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
      return NextResponse.json(
        { error: "Each question needs a question text and at least 2 options" },
        { status: 400 }
      );
    }
    if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return NextResponse.json(
        { error: "Each question needs a valid correctIndex" },
        { status: 400 }
      );
    }
  }

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
