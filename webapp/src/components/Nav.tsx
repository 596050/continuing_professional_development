"use client";

import { useSession, signOut } from "next-auth/react";
import { features } from "@/lib/features";

export function Nav() {
  const { data: session } = useSession();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary-700 bg-primary-dark">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="text-xl font-bold tracking-tight text-white">
          Audit<span className="text-accent-light">Ready</span>CPD
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm text-primary-200 hover:text-white transition">
            How it works
          </a>
          <a href="#pricing" className="text-sm text-primary-200 hover:text-white transition">
            Pricing
          </a>
          <a href="#faq" className="text-sm text-primary-200 hover:text-white transition">
            FAQ
          </a>
          {features.DEMO_MODE && !session && (
            <a
              href="/dashboard"
              className="rounded-lg border border-accent-dark bg-accent-dark/20 px-5 py-2.5 text-sm font-medium text-accent-light transition hover:bg-accent-dark/40"
            >
              Try now
            </a>
          )}
          {session ? (
            <>
              <a
                href="/dashboard"
                className="text-sm font-medium text-primary-200 hover:text-white transition"
              >
                Dashboard
              </a>
              <a
                href="/quizzes"
                className="text-sm font-medium text-primary-200 hover:text-white transition"
              >
                Quizzes
              </a>
              <a
                href="/settings"
                className="text-sm font-medium text-primary-200 hover:text-white transition"
              >
                Settings
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer text-sm text-primary-300 hover:text-white transition active:text-primary-100"
              >
                Sign out
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || "U"}
              </div>
            </>
          ) : (
            <>
              <a
                href="/auth/signin"
                className="text-sm font-medium text-primary-200 hover:text-white transition"
              >
                Sign in
              </a>
              <a
                href="#pricing"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark"
              >
                Get set up
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
