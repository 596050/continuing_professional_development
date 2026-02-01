"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface FormData {
  fullName: string;
  email: string;
  credential: string;
  additionalCredentials: string[];
  jurisdiction: string;
  role: string;
  renewalDeadline: string;
  currentHoursCompleted: string;
  preferredLearningFormat: string[];
  biggestPainPoint: string;
}

const credentials = [
  "CFP (Certified Financial Planner)",
  "QAFP (Qualified Associate Financial Planner)",
  "IAR (Investment Adviser Representative)",
  "RIA (Registered Investment Adviser)",
  "Series 6 / 7 / 63 / 65 / 66 (FINRA)",
  "UK FCA Adviser (Retail Investment)",
  "CII / PFS Member",
  "CISI Member",
  "FASEA (Australia)",
  "FP Canada - CFP or QAFP",
  "MAS Licensed Rep (Singapore)",
  "SFC Licensed Rep (Hong Kong)",
  "Insurance - Life / P&C",
  "Other",
];

const jurisdictions = [
  "United States - select state below",
  "United Kingdom",
  "Australia",
  "Canada",
  "Singapore",
  "Hong Kong",
  "European Union",
  "Other",
];

const roles = [
  "Independent financial adviser / planner",
  "Adviser at a firm / network",
  "Compliance officer / manager",
  "Paraplanner / support",
  "Trainee / new entrant",
  "Other",
];

const learningFormats = [
  "Short modules (10–20 min)",
  "Live webinars",
  "Self-paced online courses",
  "Conferences / events",
  "Reading / articles",
  "Podcasts / audio",
];

const painPoints = [
  "I don't know what my exact requirements are",
  "I know the requirements but can't find approved activities",
  "Tracking and evidence management is a mess",
  "I always leave it to the last minute",
  "My firm needs a compliance dashboard",
  "Requirements just changed and I'm confused",
  "Other",
];

const steps = [
  { id: 1, label: "About you" },
  { id: 2, label: "Credentials" },
  { id: 3, label: "Preferences" },
  { id: 4, label: "Submit" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Pre-populate from session to avoid re-entering signup data
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    credential: "",
    additionalCredentials: [],
    jurisdiction: "",
    role: "",
    renewalDeadline: "",
    currentHoursCompleted: "",
    preferredLearningFormat: [],
    biggestPainPoint: "",
  });

  // Auto-fill name and email from session when available
  const [prefilled, setPrefilled] = useState(false);
  if (session?.user && !prefilled) {
    setPrefilled(true);
    if (session.user.name && !formData.fullName) {
      setFormData((prev) => ({ ...prev, fullName: session.user?.name ?? prev.fullName }));
    }
    if (session.user.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: session.user?.email ?? prev.email }));
    }
  }

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: "additionalCredentials" | "preferredLearningFormat", item: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i) => i !== item)
        : [...prev[field], item],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          // Not authenticated - redirect to sign up
          router.push("/auth/signup");
          return;
        }
        throw new Error(data.error || "Failed to save onboarding data");
      }

      setSubmitted(true);
      // Redirect to dashboard after brief delay
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
            <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-text">You&apos;re all set!</h1>
          <p className="mt-3 text-text-muted">
            Your CPD plan and dashboard are ready. Redirecting you now...
          </p>
          <a href="/dashboard" className="mt-6 inline-block text-sm font-medium text-accent underline">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      {/* Header */}
      <div className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="text-lg font-bold tracking-tight text-text">
            Audit<span className="text-accent">Ready</span>CPD
          </div>
          <div className="text-sm text-text-light">Onboarding</div>
        </div>
      </div>

      {/* Progress */}
      <div className="mx-auto max-w-2xl px-6 pt-8">
        <div className="flex items-center justify-between">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  step >= s.id
                    ? "bg-accent text-white"
                    : "bg-gray-200 text-text-light"
                }`}
              >
                {s.id}
              </div>
              <span className="hidden text-sm text-text-muted sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-gray-200">
          <div
            className="h-1.5 rounded-full bg-accent transition-all"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          {/* Step 1: About You */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-text">About you</h2>
              <p className="mt-1 text-sm text-text-light">Basic info so we can set up your account.</p>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-muted">Full name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">Email address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">Your role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => updateField("role", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
                  >
                    <option value="">Select your role...</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Credentials & Jurisdiction */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-text">Your credentials</h2>
              <p className="mt-1 text-sm text-text-light">
                Tell us what you hold so we can map your exact CPD/CE requirements.
              </p>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-muted">
                    Primary credential
                  </label>
                  <select
                    value={formData.credential}
                    onChange={(e) => updateField("credential", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
                  >
                    <option value="">Select credential...</option>
                    {credentials.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">
                    Additional credentials (select all that apply)
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {credentials.map((c) => (
                      <label
                        key={c}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          formData.additionalCredentials.includes(c)
                            ? "border-accent-200 bg-accent-50 text-accent-dark"
                            : "border-border text-text-muted hover:bg-surface-alt"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.additionalCredentials.includes(c)}
                          onChange={() => toggleArrayItem("additionalCredentials", c)}
                          className="sr-only"
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">Jurisdiction</label>
                  <select
                    value={formData.jurisdiction}
                    onChange={(e) => updateField("jurisdiction", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
                  >
                    <option value="">Select jurisdiction...</option>
                    {jurisdictions.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">
                    Next renewal deadline
                  </label>
                  <input
                    type="date"
                    value={formData.renewalDeadline}
                    onChange={(e) => updateField("renewalDeadline", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-text">Your preferences</h2>
              <p className="mt-1 text-sm text-text-light">
                Help us build a plan that fits how you like to learn.
              </p>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-muted">
                    CPD/CE hours completed this cycle so far
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentHoursCompleted}
                    onChange={(e) => updateField("currentHoursCompleted", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">
                    Preferred learning formats (select all that apply)
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {learningFormats.map((f) => (
                      <label
                        key={f}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          formData.preferredLearningFormat.includes(f)
                            ? "border-accent-200 bg-accent-50 text-accent-dark"
                            : "border-border text-text-muted hover:bg-surface-alt"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.preferredLearningFormat.includes(f)}
                          onChange={() => toggleArrayItem("preferredLearningFormat", f)}
                          className="sr-only"
                        />
                        {f}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted">
                    Biggest CPD/CE pain point right now
                  </label>
                  <select
                    value={formData.biggestPainPoint}
                    onChange={(e) => updateField("biggestPainPoint", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:ring-accent"
                  >
                    <option value="">Select...</option>
                    {painPoints.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-text">Review & submit</h2>
              <p className="mt-1 text-sm text-text-light">
                Confirm your details and we&apos;ll get started on your CPD plan.
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-surface-alt p-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-light">Name</span>
                      <span className="font-medium text-text">{formData.fullName || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-light">Email</span>
                      <span className="font-medium text-text">{formData.email || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-light">Role</span>
                      <span className="font-medium text-text">{formData.role || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-light">Primary credential</span>
                      <span className="font-medium text-text">{formData.credential || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-light">Jurisdiction</span>
                      <span className="font-medium text-text">{formData.jurisdiction || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-light">Next renewal</span>
                      <span className="font-medium text-text">
                        {formData.renewalDeadline || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-light">Hours completed</span>
                      <span className="font-medium text-text">
                        {formData.currentHoursCompleted || "0"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-light">Pain point</span>
                      <span className="max-w-xs text-right font-medium text-text">
                        {formData.biggestPainPoint || "-"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-light">
                  By submitting, you agree that we&apos;ll use this information to build your
                  personalised CPD plan and dashboard. We do not complete coursework or assessments
                  on your behalf.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger-light p-3 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="cursor-pointer rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-alt active:bg-gray-200"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="cursor-pointer rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark active:bg-accent-700"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="cursor-pointer rounded-lg bg-accent px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-dark active:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Submit & get started"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
