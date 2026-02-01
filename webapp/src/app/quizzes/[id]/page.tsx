"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import {
  Button, LinkButton, Spinner,
  AppNav, Badge, Card, Alert,
} from "@/components/ui";

interface Question {
  index: number;
  question: string;
  options: string[];
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  passMark: number;
  maxAttempts: number;
  timeLimit: number | null;
  hours: number;
  category: string | null;
  questionCount: number;
  questions: Question[];
}

interface AttemptHistory {
  id: string;
  score: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
}

interface SubmitResult {
  questionIndex: number;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string | null;
}

interface SubmitResponse {
  attempt: { id: string; score: number; passed: boolean; attemptsUsed: number; attemptsRemaining: number };
  results: SubmitResult[];
  certificate: { id: string; certificateCode: string; verificationUrl: string } | null;
  cpdRecord: { id: string; hours: number } | null;
}

type Phase = "intro" | "quiz" | "results";

export default function QuizPlayerPage() {
  const { data: session, status: authStatus } = useSession();
  const { id } = useParams<{ id: string }>();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [attempts, setAttempts] = useState<AttemptHistory[]>([]);
  const [attemptsRemaining, setAttemptsRemaining] = useState(0);
  const [hasPassed, setHasPassed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Results
  const [result, setResult] = useState<SubmitResponse | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated" || !id) return;
    fetch(`/api/quizzes/${id}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => {
        setQuiz(data.quiz);
        setAttempts(data.attempts ?? []);
        setAttemptsRemaining(data.attemptsRemaining ?? 0);
        setHasPassed(data.hasPassed ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authStatus, id]);

  const startQuiz = useCallback(() => {
    if (!quiz) return;
    setAnswers(new Array(quiz.questionCount).fill(null));
    setCurrentQ(0);
    setResult(null);
    setPhase("quiz");
    if (quiz.timeLimit) {
      setTimeLeft(quiz.timeLimit * 60);
    }
  }, [quiz]);

  // Timer
  useEffect(() => {
    if (phase !== "quiz" || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t !== null && t > 0 ? t - 1 : 0));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft === null]);

  const selectAnswer = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optionIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!quiz || submitting) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    // Replace nulls with -1 (unanswered)
    const finalAnswers = answers.map((a) => a ?? -1);

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      if (!res.ok) throw new Error();
      const data: SubmitResponse = await res.json();
      setResult(data);
      setAttemptsRemaining(data.attempt.attemptsRemaining);
      if (data.attempt.passed) setHasPassed(true);
      setPhase("results");
    } catch {
      // Submission failed
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = answers.filter((a) => a !== null).length;

  if (authStatus === "loading" || loading) return <Spinner text="Loading quiz..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Sign in required</h1>
          <p className="mt-2 text-gray-600">Please sign in to take quizzes.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Quiz not found</h1>
          <a href="/quizzes" className="mt-4 inline-block text-sm font-medium text-blue-600 underline">Back to quizzes</a>
        </div>
      </div>
    );
  }

  // ─── INTRO PHASE ──────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <a href="/quizzes" className="text-sm font-medium text-blue-600 hover:underline">&larr; Back to quizzes</a>

          <Card className="mt-6" padding="lg">
            {quiz.category && (
              <Badge variant="blue" shape="rounded" className="capitalize">{quiz.category}</Badge>
            )}
            <h1 className="mt-3 text-2xl font-bold text-gray-900">{quiz.title}</h1>
            {quiz.description && <p className="mt-2 text-sm text-gray-600">{quiz.description}</p>}

            <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-4">
              <Stat label="Questions" value={String(quiz.questionCount)} />
              <Stat label="Pass mark" value={`${quiz.passMark}%`} />
              <Stat label="CPD hours" value={String(quiz.hours)} />
              <Stat label="Time limit" value={quiz.timeLimit ? `${quiz.timeLimit} min` : "None"} />
            </div>

            {/* Attempt history */}
            {attempts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700">Previous attempts</h3>
                <div className="mt-2 space-y-2">
                  {attempts.map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2 text-sm">
                      <span className="text-gray-600">Attempt {attempts.length - i}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{a.score}%</span>
                        <Badge variant={a.passed ? "green" : "red"} className="px-2 py-0.5">
                          {a.passed ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action */}
            <div className="mt-8">
              {hasPassed ? (
                <Alert variant="success">
                  <p className="font-semibold">You have already passed this quiz.</p>
                  <p className="mt-1">Your certificate and CPD hours have been recorded.</p>
                  <a href="/dashboard" className="mt-3 inline-block text-sm font-medium underline">View dashboard</a>
                </Alert>
              ) : attemptsRemaining <= 0 ? (
                <Alert variant="error">
                  <p className="font-semibold">No attempts remaining</p>
                  <p className="mt-1">You have used all {quiz.maxAttempts} attempts. Contact support for a reset.</p>
                </Alert>
              ) : (
                <Button fullWidth size="lg" onClick={startQuiz}>
                  {attempts.length > 0 ? `Retry quiz (${attemptsRemaining} attempt${attemptsRemaining !== 1 ? "s" : ""} left)` : "Start quiz"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ─── QUIZ PHASE ───────────────────────────────────────────────────
  if (phase === "quiz") {
    const question = quiz.questions[currentQ];
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Quiz header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
            <span className="text-sm font-semibold text-gray-900">{quiz.title}</span>
            <div className="flex items-center gap-4">
              {timeLeft !== null && (
                <span className={`rounded px-2.5 py-1 text-sm font-mono font-medium ${timeLeft < 60 ? "bg-red-100 text-red-700" : timeLeft < 300 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                  {formatTime(timeLeft)}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {answeredCount}/{quiz.questionCount} answered
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-1 bg-blue-600 transition-all duration-300"
              style={{ width: `${((currentQ + 1) / quiz.questionCount) * 100}%` }}
            />
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Question */}
          <Card padding="lg">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Question {currentQ + 1} of {quiz.questionCount}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-gray-900">{question.question}</h2>

            <div className="mt-6 space-y-3">
              {question.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  className={`w-full cursor-pointer rounded-lg border px-5 py-4 text-left text-sm transition ${
                    answers[currentQ] === i
                      ? "border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className={`mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    answers[currentQ] === i ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </Card>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
              disabled={currentQ === 0}
            >
              Previous
            </Button>

            <div className="flex gap-1.5">
              {quiz.questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-medium transition ${
                    i === currentQ
                      ? "bg-blue-600 text-white"
                      : answers[i] !== null
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {currentQ < quiz.questionCount - 1 ? (
              <Button onClick={() => setCurrentQ((q) => Math.min(quiz.questionCount - 1, q + 1))}>
                Next
              </Button>
            ) : (
              <Button variant="success" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit quiz"}
              </Button>
            )}
          </div>

          {/* Unanswered warning */}
          {answeredCount < quiz.questionCount && currentQ === quiz.questionCount - 1 && (
            <p className="mt-3 text-center text-xs text-amber-600">
              {quiz.questionCount - answeredCount} question{quiz.questionCount - answeredCount !== 1 ? "s" : ""} unanswered. Unanswered questions will be marked incorrect.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── RESULTS PHASE ────────────────────────────────────────────────
  if (phase === "results" && result) {
    const { attempt, results: questionResults, certificate } = result;

    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="mx-auto max-w-3xl px-6 py-12">
          {/* Score card */}
          <Card variant={attempt.passed ? "success" : "error"} padding="lg" className="text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${attempt.passed ? "bg-emerald-100" : "bg-red-100"}`}>
              {attempt.passed ? (
                <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h1 className={`mt-4 text-2xl font-bold ${attempt.passed ? "text-emerald-900" : "text-red-900"}`}>
              {attempt.passed ? "Congratulations!" : "Not quite"}
            </h1>
            <p className={`mt-1 text-4xl font-bold ${attempt.passed ? "text-emerald-700" : "text-red-700"}`}>
              {attempt.score}%
            </p>
            <p className={`mt-2 text-sm ${attempt.passed ? "text-emerald-700" : "text-red-700"}`}>
              {attempt.passed
                ? `You passed! ${quiz.hours} CPD hour${quiz.hours !== 1 ? "s" : ""} have been added to your record.`
                : `You needed ${quiz.passMark}% to pass. ${attempt.attemptsRemaining > 0 ? `${attempt.attemptsRemaining} attempt${attempt.attemptsRemaining !== 1 ? "s" : ""} remaining.` : "No attempts remaining."}`}
            </p>
          </Card>

          {/* Certificate earned */}
          {certificate && (
            <Card className="mt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Certificate earned</p>
                  <p className="text-xs text-gray-500">Code: <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">{certificate.certificateCode}</code></p>
                </div>
              </div>
              <a
                href={`/verify/${certificate.certificateCode}`}
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                View verification page
              </a>
            </Card>
          )}

          {/* Question review */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Review answers</h2>
            <div className="mt-4 space-y-4">
              {questionResults.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-5 ${r.isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${r.isCorrect ? "bg-emerald-500" : "bg-red-500"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{quiz.questions[i].question}</p>
                      <div className="mt-2 space-y-1">
                        {quiz.questions[i].options.map((opt, j) => (
                          <div
                            key={j}
                            className={`rounded px-3 py-1.5 text-sm ${
                              j === r.correctAnswer
                                ? "bg-emerald-100 font-medium text-emerald-800"
                                : j === r.selectedAnswer && !r.isCorrect
                                  ? "bg-red-100 text-red-800 line-through"
                                  : "text-gray-600"
                            }`}
                          >
                            {String.fromCharCode(65 + j)}. {opt}
                            {j === r.correctAnswer && " (correct)"}
                          </div>
                        ))}
                      </div>
                      {r.explanation && (
                        <p className="mt-2 text-xs text-gray-600 italic">{r.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-4">
            <LinkButton href="/quizzes" variant="secondary" fullWidth>
              Back to quizzes
            </LinkButton>
            {!attempt.passed && attempt.attemptsRemaining > 0 && (
              <Button onClick={startQuiz} fullWidth>
                Retry ({attempt.attemptsRemaining} left)
              </Button>
            )}
            {attempt.passed && (
              <LinkButton href="/dashboard" variant="success" fullWidth>
                View dashboard
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
