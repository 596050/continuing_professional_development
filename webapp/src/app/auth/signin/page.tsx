"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          <a href="/" className="text-2xl font-bold tracking-tight text-text">
            Audit<span className="text-accent">Ready</span>CPD
          </a>
          <h1 className="mt-6 text-2xl font-bold text-text">Sign in to your account</h1>
          <p className="mt-2 text-sm text-text-muted">
            Or{" "}
            <a href="/auth/signup" className="font-medium text-accent hover:text-accent-dark">
              create a new account
            </a>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-light p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-muted">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
              placeholder="Min. 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-dark active:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-text-light">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
