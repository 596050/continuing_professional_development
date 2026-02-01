import { NextResponse } from "next/server";
import { requireAuth, requireRole, validationError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { updateQuizSchema } from "@/lib/schemas";

// GET /api/quizzes/[id] - Get quiz details with questions (no answers)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

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
  const session = await requireRole("admin", "firm_admin");
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateQuizSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const updates: Record<string, unknown> = {};
  const data = parsed.data;

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.passMark !== undefined) updates.passMark = data.passMark;
  if (data.maxAttempts !== undefined) updates.maxAttempts = data.maxAttempts;
  if (data.timeLimit !== undefined) updates.timeLimit = data.timeLimit;
  if (data.hours !== undefined) updates.hours = data.hours;
  if (data.category !== undefined) updates.category = data.category;
  if (data.activityType !== undefined) updates.activityType = data.activityType;
  if (data.questionsJson !== undefined) updates.questionsJson = data.questionsJson;
  if (data.active !== undefined) updates.active = data.active;

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
  const session = await requireRole("admin", "firm_admin");
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  await prisma.quiz.update({ where: { id }, data: { active: false } });

  return NextResponse.json({ message: "Quiz deactivated" });
}
