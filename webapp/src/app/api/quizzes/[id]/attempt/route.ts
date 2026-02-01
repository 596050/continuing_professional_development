/**
 * Quiz Attempt Submission - POST /api/quizzes/[id]/attempt
 *
 * The most complex single endpoint in the platform: handles answer
 * submission, auto-grading, attempt limiting, and cascading side effects
 * (CPD record + certificate auto-generation on pass).
 *
 * FLOW:
 * 1. Validate quiz exists and is active
 * 2. Check if user has remaining attempts (maxAttempts enforcement)
 * 3. Validate answer array matches question count
 * 4. Grade each answer against the question bank's correctIndex
 * 5. Calculate score as percentage correct, compare to passMark
 * 6. Store attempt with answers + score + passed flag
 * 7. IF passed AND quiz.hours > 0:
 *    a. Create a CpdRecord (source="platform") - this adds to the user's
 *       hour total automatically via the dashboard aggregation
 *    b. Create a Certificate with auto-generated CERT-YYYY-xxxxxxxx code
 *    c. Link certificate to the CPD record for audit trail
 *    d. Store quiz metadata on certificate (quizScore, quizId, attemptId)
 *
 * WHY AUTO-CERTIFICATE:
 * For platform-delivered content (Lane A: Hosted Academy), the quiz IS the
 * proof of learning. The certificate is generated instantly because there's
 * no manual approval needed - the quiz score is verifiable evidence. This
 * is the key UX advantage over manual CPD logging.
 *
 * ATTEMPT LIMITING:
 * maxAttempts prevents infinite retries (regulatory concern for ethics
 * assessments). Once exhausted, the user must contact support or wait
 * for a reset. The API returns attemptsUsed and attemptsRemaining for
 * the frontend to show retry state.
 */
import { NextResponse } from "next/server";
import { requireAuth, validationError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { generateCertificateCode } from "@/lib/pdf";
import { submitQuizAttemptSchema } from "@/lib/schemas";

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
  const limited = withRateLimit(request, "quiz-attempt", { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

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
  const parsed = submitQuizAttemptSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const { answers } = parsed.data;

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
    const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
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
