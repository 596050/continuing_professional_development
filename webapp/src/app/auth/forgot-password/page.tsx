"use client";

import { useState } from "react";
import { Button, Card, Input, Alert } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Request failed");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold tracking-tight text-gray-900">
            Audit<span className="text-blue-600">Ready</span>CPD
          </a>
        </div>

        <Card>
          <h1 className="text-xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {sent ? (
            <Alert variant="success" className="mt-6">
              If an account with that email exists, a reset link has been sent. Check your inbox.
            </Alert>
          ) : (
            <div className="mt-6 space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              {error && <Alert variant="error">{error}</Alert>}

              <Button
                fullWidth
                onClick={handleSubmit}
                disabled={submitting || !email}
              >
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            <a href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-700">
              Back to sign in
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
