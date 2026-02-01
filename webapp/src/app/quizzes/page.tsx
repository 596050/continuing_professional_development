"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Spinner, AppNav, Badge, EmptyState } from "@/components/ui";

interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  passMark: number;
  maxAttempts: number;
  timeLimit: number | null;
  hours: number;
  category: string | null;
  questionCount: number;
  userAttempts: number;
  bestScore: number | null;
  hasPassed: boolean;
  attemptsRemaining: number;
}

export default function QuizzesPage() {
  const { data: session, status: authStatus } = useSession();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetch("/api/quizzes")
      .then((res) => res.json())
      .then((data) => setQuizzes(data.quizzes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authStatus]);

  if (authStatus === "loading" || loading) return <Spinner text="Loading quizzes..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="mt-2 text-gray-600">Please sign in to access quizzes.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  const categories = [...new Set(quizzes.map((q) => q.category).filter(Boolean))] as string[];
  const filtered = filter === "all" ? quizzes : quizzes.filter((q) => q.category === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CPD Assessments</h1>
            <p className="mt-1 text-sm text-gray-600">
              Complete quizzes to earn CPD hours and certificates automatically.
            </p>
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${filter === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Quiz grid */}
        {filtered.length === 0 ? (
          <div className="mt-12">
            <EmptyState message="No quizzes available yet." />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((quiz) => (
              <a
                key={quiz.id}
                href={`/quizzes/${quiz.id}`}
                className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {quiz.category && (
                      <Badge variant="blue" shape="rounded" className="capitalize">{quiz.category}</Badge>
                    )}
                    <h3 className="mt-2 text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {quiz.title}
                    </h3>
                    {quiz.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{quiz.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{quiz.questionCount} questions</span>
                  <span>{quiz.hours}h CPD</span>
                  <span>Pass: {quiz.passMark}%</span>
                  {quiz.timeLimit && <span>{quiz.timeLimit}min</span>}
                </div>

                {/* Status */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  {quiz.hasPassed ? (
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                        <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-emerald-700">Passed ({quiz.bestScore}%)</span>
                    </div>
                  ) : quiz.attemptsRemaining <= 0 ? (
                    <span className="text-sm font-medium text-red-600">No attempts remaining</span>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {quiz.userAttempts > 0
                          ? `Best: ${quiz.bestScore}% - ${quiz.attemptsRemaining} attempt${quiz.attemptsRemaining !== 1 ? "s" : ""} left`
                          : "Not attempted"}
                      </span>
                      <span className="text-sm font-semibold text-blue-600 group-hover:underline">
                        Start
                      </span>
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
