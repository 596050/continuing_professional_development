import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/quizzes/[id] - Get quiz details with questions (no answers)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const quiz = await prisma.quiz.findFirst({
    where: { id, active: true },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Parse questions and strip correct answers
  const questions = JSON.parse(quiz.questionsJson).map(
    (q: { question: string; options: string[]; explanation?: string }, index: number) => ({
      index,
      question: q.question,
      options: q.options,
      // Do NOT include correctIndex or explanation
    })
  );

  // Get user's previous attempts
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: session.user.id, quizId: quiz.id },
    orderBy: { startedAt: "desc" },
    select: { id: true, score: true, passed: true, startedAt: true, completedAt: true },
  });

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      passMark: quiz.passMark,
      maxAttempts: quiz.maxAttempts,
      timeLimit: quiz.timeLimit,
      hours: quiz.hours,
      category: quiz.category,
      questionCount: questions.length,
      questions,
    },
    attempts,
    attemptsRemaining: quiz.maxAttempts - attempts.length,
    hasPassed: attempts.some((a) => a.passed),
  });
}

// PATCH /api/quizzes/[id] - Update quiz details (admin/firm_admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || !["admin", "firm_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.passMark !== undefined) updates.passMark = body.passMark;
  if (body.maxAttempts !== undefined) updates.maxAttempts = body.maxAttempts;
  if (body.timeLimit !== undefined) updates.timeLimit = body.timeLimit;
  if (body.hours !== undefined) updates.hours = body.hours;
  if (body.category !== undefined) updates.category = body.category;
  if (body.activityType !== undefined) updates.activityType = body.activityType;
  if (body.questionsJson !== undefined) updates.questionsJson = body.questionsJson;
  if (body.active !== undefined) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.quiz.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    description: updated.description,
    passMark: updated.passMark,
    maxAttempts: updated.maxAttempts,
    hours: updated.hours,
    active: updated.active,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

// DELETE /api/quizzes/[id] - Deactivate quiz (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || !["admin", "firm_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  await prisma.quiz.update({ where: { id }, data: { active: false } });

  return NextResponse.json({ message: "Quiz deactivated" });
}
