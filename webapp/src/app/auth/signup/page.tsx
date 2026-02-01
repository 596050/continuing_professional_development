"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Create account
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create account");
      setLoading(false);
      return;
    }

    // Auto sign-in after signup
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Account created but sign-in failed. Please try signing in.");
    } else {
      router.push("/onboarding");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          <a href="/" className="text-2xl font-bold tracking-tight text-text">
            Audit<span className="text-accent">Ready</span>CPD
          </a>
          <h1 className="mt-6 text-2xl font-bold text-text">Create your account</h1>
          <p className="mt-2 text-sm text-text-muted">
            Already have an account?{" "}
            <a href="/auth/signin" className="font-medium text-accent hover:text-accent-dark">
              Sign in
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
            <label htmlFor="name" className="block text-sm font-medium text-text-muted">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
              placeholder="Jane Smith"
            />
          </div>

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
              minLength={8}
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-text-light">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
          We do not complete coursework or assessments on your behalf.
        </p>
      </div>
    </div>
  );
}
