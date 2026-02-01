"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { features, DEMO_USER } from "@/lib/features";

interface DashboardData {
  user: { name: string; email: string; plan: string; role: string };
  credential: {
    name: string;
    body: string;
    region: string;
    hoursRequired: number;
    ethicsRequired: number;
    structuredRequired: number;
    cycleLengthYears: number;
    categoryRules: Record<string, unknown> | null;
  } | null;
  progress: {
    totalHoursCompleted: number;
    hoursRequired: number;
    ethicsHoursCompleted: number;
    ethicsRequired: number;
    structuredHoursCompleted: number;
    structuredRequired: number;
    progressPercent: number;
    certificateCount: number;
  };
  deadline: {
    renewalDeadline: string | null;
    daysUntilDeadline: number | null;
    jurisdiction: string | null;
  };
  activities: {
    id: string;
    title: string;
    provider: string | null;
    activityType: string;
    hours: number;
    date: string;
    status: string;
    category: string | null;
    source: string;
  }[];
}

interface LogFormData {
  title: string;
  provider: string;
  hours: string;
  date: string;
  activityType: string;
  category: string;
  notes: string;
}

const emptyLogForm: LogFormData = {
  title: "",
  provider: "",
  hours: "",
  date: new Date().toISOString().split("T")[0],
  activityType: "structured",
  category: "general",
  notes: "",
};

// Demo data for unauthenticated demo mode
const mockActivities = [
  { id: "d1", title: "Ethics in Financial Planning", provider: "CFP Board", activityType: "structured", hours: 2, date: "2026-01-15", status: "completed", category: "ethics", source: "manual" },
  { id: "d2", title: "Tax Year-End Planning Strategies", provider: "Kitces.com", activityType: "structured", hours: 3, date: "2026-01-22", status: "completed", category: "general", source: "manual" },
  { id: "d3", title: "Client Communication & Vulnerability", provider: "AuditReadyCPD", activityType: "structured", hours: 1.5, date: "2026-02-03", status: "completed", category: "general", source: "platform" },
  { id: "d4", title: "Retirement Income Decumulation", provider: "Morningstar", activityType: "structured", hours: 2, date: "2026-02-10", status: "completed", category: "general", source: "manual" },
  { id: "d5", title: "Regulatory Update: 40-Hour CE Changes", provider: "AuditReadyCPD", activityType: "structured", hours: 1.5, date: "2026-02-18", status: "completed", category: "general", source: "platform" },
  { id: "d6", title: "Estate Planning Fundamentals", provider: "CFP Board", activityType: "structured", hours: 4, date: "2026-03-01", status: "completed", category: "general", source: "manual" },
];

function getDemoData(): DashboardData {
  return {
    user: { name: DEMO_USER.fullName, email: DEMO_USER.email, plan: DEMO_USER.plan, role: "user" },
    credential: { name: "CFP", body: "CFP Board", region: "US", hoursRequired: 40, ethicsRequired: 2, structuredRequired: 0, cycleLengthYears: 2, categoryRules: null },
    progress: { totalHoursCompleted: DEMO_USER.hoursCompleted, hoursRequired: DEMO_USER.hoursRequired, ethicsHoursCompleted: 2, ethicsRequired: 2, structuredHoursCompleted: 14, structuredRequired: 0, progressPercent: Math.round((DEMO_USER.hoursCompleted / DEMO_USER.hoursRequired) * 100), certificateCount: 5 },
    deadline: { renewalDeadline: "2027-03-31T00:00:00.000Z", daysUntilDeadline: 424, jurisdiction: "US" },
    activities: mockActivities,
  };
}

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState<LogFormData>(emptyLogForm);
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState("");
  const isDemo = !session?.user && features.DEMO_MODE;

  const fetchDashboard = useCallback(async () => {
    if (isDemo) {
      setData(getDemoData());
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail - show empty state
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    if (authStatus === "loading") return;
    fetchDashboard();
  }, [authStatus, fetchDashboard]);

  const handleLogActivity = async () => {
    setLogSaving(true);
    setLogError("");

    try {
      const res = await fetch("/api/cpd-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log activity");
      }

      setShowLogForm(false);
      setLogForm(emptyLogForm);
      fetchDashboard(); // Refresh data
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLogSaving(false);
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user && !isDemo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Please sign in to access your dashboard.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Something went wrong loading your dashboard.</p>
          <button onClick={fetchDashboard} className="mt-4 text-sm font-medium text-blue-600 underline">Try again</button>
        </div>
      </div>
    );
  }

  const { user, credential, progress, deadline, activities } = data;
  const hoursRemaining = Math.max(0, progress.hoursRequired - progress.totalHoursCompleted);

  // Color coding based on deadline proximity
  const urgencyColor = deadline.daysUntilDeadline !== null
    ? deadline.daysUntilDeadline < 60 ? "text-red-600" : deadline.daysUntilDeadline < 180 ? "text-amber-600" : "text-gray-900"
    : "text-gray-900";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="text-lg font-bold tracking-tight text-gray-900">
            Audit<span className="text-blue-600">Ready</span>CPD
          </a>
          <div className="flex items-center gap-4">
            {isDemo && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                Demo mode
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name || user.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Demo banner */}
        {isDemo && (
          <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">You&apos;re viewing the demo dashboard</p>
                <p className="mt-1 text-sm text-emerald-700">
                  This shows what your CPD tracking looks like after setup. Mock data for a CFP professional in the US.{" "}
                  <a href="/auth/signup" className="font-medium underline">Get your own dashboard</a>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No credential banner */}
        {!isDemo && !credential && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Complete your profile</strong> to see personalised CPD requirements.{" "}
              <a href="/onboarding" className="font-medium underline">Go to onboarding</a>
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-sm font-medium text-gray-500">Hours Completed</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{progress.totalHoursCompleted}</div>
            <div className="mt-1 text-sm text-gray-500">
              {progress.hoursRequired > 0 ? `of ${progress.hoursRequired} required` : "logged"}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-sm font-medium text-gray-500">Hours Remaining</div>
            <div className={`mt-2 text-3xl font-bold ${urgencyColor}`}>{hoursRemaining}</div>
            <div className="mt-1 text-sm text-gray-500">to complete this cycle</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-sm font-medium text-gray-500">Progress</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{progress.progressPercent}%</div>
            <div className="mt-3 h-2 rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${progress.progressPercent}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-sm font-medium text-gray-500">Certificates</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">{progress.certificateCount}</div>
            <div className="mt-1 text-sm text-gray-500">in your vault</div>
          </div>
        </div>

        {/* CPD Gap Analysis */}
        {credential && (progress.ethicsRequired > 0 || progress.structuredRequired > 0) && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">CPD Gap Analysis - {credential.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{credential.body} ({credential.region})</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {/* Total hours */}
              <GapBar
                label="Total Hours"
                completed={progress.totalHoursCompleted}
                required={progress.hoursRequired}
              />
              {/* Ethics */}
              {progress.ethicsRequired > 0 && (
                <GapBar
                  label="Ethics Hours"
                  completed={progress.ethicsHoursCompleted}
                  required={progress.ethicsRequired}
                />
              )}
              {/* Structured */}
              {progress.structuredRequired > 0 && (
                <GapBar
                  label="Structured/Verifiable"
                  completed={progress.structuredHoursCompleted}
                  required={progress.structuredRequired}
                />
              )}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Activities */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">CPD Activities</h2>
                {!isDemo && (
                  <button
                    onClick={() => setShowLogForm(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    + Log activity
                  </button>
                )}
              </div>

              {activities.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-gray-500">No activities logged yet.</p>
                  {!isDemo && (
                    <button
                      onClick={() => setShowLogForm(true)}
                      className="mt-3 text-sm font-medium text-blue-600 underline"
                    >
                      Log your first CPD activity
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{activity.title}</span>
                          {activity.category === "ethics" && (
                            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-600">ethics</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          {activity.provider && <span>{activity.provider}</span>}
                          <span>{activity.hours}h</span>
                          <span className="capitalize">{activity.activityType}</span>
                          <span>{new Date(activity.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          activity.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : activity.status === "in_progress"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {activity.status === "in_progress" ? "in progress" : activity.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Your Profile</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {credential && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Credential</dt>
                    <dd className="font-medium text-gray-900">{credential.name}</dd>
                  </div>
                )}
                {deadline.jurisdiction && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Jurisdiction</dt>
                    <dd className="font-medium text-gray-900">{deadline.jurisdiction}</dd>
                  </div>
                )}
                {deadline.renewalDeadline && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Cycle ends</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(deadline.renewalDeadline).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Plan</dt>
                  <dd className="font-medium capitalize text-blue-600">{user.plan}</dd>
                </div>
              </dl>
            </div>

            {/* Deadlines */}
            {deadline.daysUntilDeadline !== null && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-gray-900">Upcoming Deadlines</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{credential?.name} cycle ends</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      deadline.daysUntilDeadline < 60
                        ? "bg-red-100 text-red-700"
                        : deadline.daysUntilDeadline < 180
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {deadline.daysUntilDeadline}d
                    </span>
                  </div>
                  {progress.ethicsRequired > 0 && progress.ethicsHoursCompleted < progress.ethicsRequired && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Ethics requirement</span>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {progress.ethicsRequired - progress.ethicsHoursCompleted}h remaining
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
              <div className="mt-4 space-y-2">
                {!isDemo && (
                  <button
                    onClick={() => setShowLogForm(true)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    Log CPD activity
                  </button>
                )}
                <button className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50">
                  Export audit report (PDF)
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50">
                  Export audit report (CSV)
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50">
                  Upload certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Activity Modal */}
      {showLogForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Log CPD Activity</h2>
              <button onClick={() => { setShowLogForm(false); setLogError(""); }} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Activity title *</label>
                <input
                  type="text"
                  value={logForm.title}
                  onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g. Ethics in Financial Planning"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hours *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={logForm.hours}
                    onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date *</label>
                  <input
                    type="date"
                    value={logForm.date}
                    onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Provider</label>
                <input
                  type="text"
                  value={logForm.provider}
                  onChange={(e) => setLogForm({ ...logForm, provider: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g. CFP Board, CII, Kitces.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Activity type *</label>
                  <select
                    value={logForm.activityType}
                    onChange={(e) => setLogForm({ ...logForm, activityType: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="structured">Structured</option>
                    <option value="unstructured">Unstructured</option>
                    <option value="verifiable">Verifiable</option>
                    <option value="non-verifiable">Non-verifiable</option>
                    <option value="participatory">Participatory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={logForm.category}
                    onChange={(e) => setLogForm({ ...logForm, category: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="ethics">Ethics</option>
                    <option value="technical">Technical</option>
                    <option value="regulatory_element">Regulatory Element</option>
                    <option value="firm_element">Firm Element</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Optional notes about this activity"
                />
              </div>
            </div>

            {logError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{logError}</div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowLogForm(false); setLogError(""); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogActivity}
                disabled={logSaving || !logForm.title || !logForm.hours || !logForm.date}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {logSaving ? "Saving..." : "Log activity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GapBar({ label, completed, required }: { label: string; completed: number; required: number }) {
  const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  const remaining = Math.max(0, required - completed);
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-red-500";
  const textColor = pct >= 100 ? "text-emerald-700" : pct >= 60 ? "text-blue-700" : pct >= 30 ? "text-amber-700" : "text-red-700";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-semibold ${textColor}`}>
          {completed}/{required}h
        </span>
      </div>
      <div className="mt-2 h-3 rounded-full bg-gray-200">
        <div className={`h-3 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {remaining > 0 && (
        <p className="mt-1 text-xs text-gray-500">{remaining}h remaining</p>
      )}
      {remaining <= 0 && (
        <p className="mt-1 text-xs text-emerald-600 font-medium">Complete</p>
      )}
    </div>
  );
}
