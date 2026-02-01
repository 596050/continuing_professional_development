"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, Card, Input, Alert } from "@/components/ui";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reset failed");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <Alert variant="error">Invalid reset link. Please request a new one.</Alert>
        <div className="mt-4 text-center">
          <a href="/auth/forgot-password" className="text-sm font-medium text-blue-600">
            Request new reset link
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-xl font-bold text-gray-900">Set new password</h1>

      {success ? (
        <div className="mt-6">
          <Alert variant="success">Password has been reset successfully.</Alert>
          <div className="mt-4 text-center">
            <a href="/auth/signin" className="text-sm font-medium text-blue-600">
              Sign in with your new password
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <Alert variant="error">{error}</Alert>}

          <Button
            fullWidth
            onClick={handleSubmit}
            disabled={submitting || !password || !confirmPassword}
          >
            {submitting ? "Resetting..." : "Reset password"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold tracking-tight text-gray-900">
            Audit<span className="text-blue-600">Ready</span>CPD
          </a>
        </div>
        <Suspense fallback={<Card><p className="text-sm text-gray-500">Loading...</p></Card>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
