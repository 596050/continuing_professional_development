import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateCertificateCode } from "@/lib/pdf";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

// POST /api/quizzes/[id]/attempt - Submit quiz answers
export async function POST(
  request: Request,
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

  // Check remaining attempts
  const previousAttempts = await prisma.quizAttempt.count({
    where: { userId: session.user.id, quizId: quiz.id },
  });

  if (previousAttempts >= quiz.maxAttempts) {
    return NextResponse.json(
      {
        error: "Maximum attempts reached",
        attemptsUsed: previousAttempts,
        maxAttempts: quiz.maxAttempts,
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { answers } = body;

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: "answers array is required" },
      { status: 400 }
    );
  }

  const questions: QuizQuestion[] = JSON.parse(quiz.questionsJson);

  if (answers.length !== questions.length) {
    return NextResponse.json(
      { error: `Expected ${questions.length} answers, got ${answers.length}` },
      { status: 400 }
    );
  }

  // Grade
  let correct = 0;
  const results = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctIndex;
    if (isCorrect) correct++;
    return {
      questionIndex: i,
      selectedAnswer: answers[i],
      correctAnswer: q.correctIndex,
      isCorrect,
      explanation: q.explanation ?? null,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= quiz.passMark;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      quizId: quiz.id,
      answers: JSON.stringify(answers),
      score,
      passed,
      completedAt: new Date(),
    },
  });

  // If passed, auto-generate certificate and CPD record
  let certificate = null;
  let cpdRecord = null;

  if (passed && quiz.hours > 0) {
    // Create CPD record
    cpdRecord = await prisma.cpdRecord.create({
      data: {
        userId: session.user.id,
        title: `Quiz: ${quiz.title}`,
        provider: "AuditReadyCPD",
        activityType: quiz.activityType ?? "structured",
        hours: quiz.hours,
        date: new Date(),
        status: "completed",
        category: quiz.category ?? "general",
        source: "platform",
      },
    });

    // Get user's primary credential for certificate
    const userCredential = await prisma.userCredential.findFirst({
      where: { userId: session.user.id, isPrimary: true },
      include: { credential: true },
    });

    const certificateCode = generateCertificateCode();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const verificationUrl = `${baseUrl}/api/certificates/verify/${certificateCode}`;

    certificate = await prisma.certificate.create({
      data: {
        userId: session.user.id,
        certificateCode,
        title: quiz.title,
        credentialName: userCredential?.credential?.name ?? null,
        hours: quiz.hours,
        category: quiz.category,
        activityType: quiz.activityType ?? "structured",
        provider: "AuditReadyCPD",
        completedDate: new Date(),
        verificationUrl,
        cpdRecordId: cpdRecord.id,
        metadata: JSON.stringify({ quizScore: score, quizId: quiz.id, attemptId: attempt.id }),
      },
    });
  }

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      score,
      passed,
      attemptsUsed: previousAttempts + 1,
      attemptsRemaining: quiz.maxAttempts - previousAttempts - 1,
    },
    results,
    certificate: certificate ? {
      id: certificate.id,
      certificateCode: certificate.certificateCode,
      verificationUrl: certificate.verificationUrl,
    } : null,
    cpdRecord: cpdRecord ? { id: cpdRecord.id, hours: cpdRecord.hours } : null,
  });
}
