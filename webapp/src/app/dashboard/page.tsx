"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { features, DEMO_USER } from "@/lib/features";
import {
  Button, Spinner, AppNav, StatsCard, Card,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Input, Select, Textarea, FileInput,
  Alert, Badge, StatusBadge, ProgressBar, EmptyState,
} from "@/components/ui";

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
  evidenceStrength?: string;
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
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRecordId, setUploadRecordId] = useState("");
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "csv" | "zip" | null>(null);
  const [showAuditPack, setShowAuditPack] = useState(false);
  const [auditMinStrength, setAuditMinStrength] = useState("manual_only");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // Allocation modal
  const [allocRecordId, setAllocRecordId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<{ userCredentialId: string; hours: number; credentialName: string }[]>([]);
  const [userCredentials, setUserCredentials] = useState<{ id: string; credentialName: string }[]>([]);
  const [allocSaving, setAllocSaving] = useState(false);
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

  const handleExport = async (format: "pdf" | "csv") => {
    setExporting(format);
    try {
      const url = format === "pdf" ? "/api/export/audit-report" : "/api/export/audit-csv";
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? `audit_report.${format === "pdf" ? "pdf" : "csv"}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      // Could add toast notification here
    } finally {
      setExporting(null);
    }
  };

  const handleUploadEvidence = async () => {
    if (!uploadFile) return;
    setUploadSaving(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadRecordId) formData.append("cpdRecordId", uploadRecordId);
      const res = await fetch("/api/evidence", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadRecordId("");
      fetchDashboard();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploadSaving(false);
    }
  };

  const handleAuditPackExport = async () => {
    setExporting("zip");
    try {
      const params = new URLSearchParams();
      if (auditMinStrength) params.set("minStrength", auditMinStrength);
      if (auditFrom) params.set("from", auditFrom);
      if (auditTo) params.set("to", auditTo);
      const res = await fetch(`/api/export/audit-pack?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `audit-pack-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setShowAuditPack(false);
    } catch {
      // Could add toast notification
    } finally {
      setExporting(null);
    }
  };

  const handleOpenAllocations = async (recordId: string) => {
    setAllocRecordId(recordId);
    try {
      const [allocRes, settingsRes] = await Promise.all([
        fetch(`/api/allocations?cpdRecordId=${recordId}`).then((r) => r.ok ? r.json() : { allocations: [] }),
        fetch("/api/settings").then((r) => r.ok ? r.json() : { credentials: [] }),
      ]);
      const creds = (settingsRes.credentials ?? []).map((c: { id: string; name: string }) => ({
        id: c.id,
        credentialName: c.name,
      }));
      setUserCredentials(creds);
      const existing = (allocRes.allocations ?? []).map((a: { userCredentialId: string; hours: number; credentialName: string }) => ({
        userCredentialId: a.userCredentialId,
        hours: a.hours,
        credentialName: a.credentialName,
      }));
      if (existing.length > 0) {
        setAllocations(existing);
      } else if (creds.length > 0) {
        // Default: allocate all hours to first credential
        const record = allActivities.find((a) => a.id === recordId);
        setAllocations([{ userCredentialId: creds[0].id, hours: record?.hours ?? 0, credentialName: creds[0].credentialName }]);
      }
    } catch {
      // Silently fail
    }
  };

  const handleSaveAllocations = async () => {
    if (!allocRecordId) return;
    setAllocSaving(true);
    try {
      const res = await fetch("/api/allocations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpdRecordId: allocRecordId,
          allocations: allocations.map((a) => ({
            userCredentialId: a.userCredentialId,
            hours: a.hours,
          })),
        }),
      });
      if (res.ok) {
        setAllocRecordId(null);
        setAllocations([]);
      }
    } catch {
      // Silently fail
    } finally {
      setAllocSaving(false);
    }
  };

  if (authStatus === "loading" || loading) return <Spinner text="Loading dashboard..." />;

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

  const { user, credential, progress, deadline, activities: allActivities } = data;
  const activities = allActivities.filter((a) => {
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase()) && !a.provider?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    return true;
  });
  const hoursRemaining = Math.max(0, progress.hoursRequired - progress.totalHoursCompleted);

  // Color coding based on deadline proximity
  const urgencyColor = deadline.daysUntilDeadline !== null
    ? deadline.daysUntilDeadline < 60 ? "text-red-600" : deadline.daysUntilDeadline < 180 ? "text-amber-600" : "text-gray-900"
    : "text-gray-900";

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav>
        {isDemo && <Badge variant="amber">Demo mode</Badge>}
      </AppNav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Demo banner */}
        {isDemo && (
          <Alert variant="success" className="mb-8">
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
          </Alert>
        )}

        {/* No credential banner */}
        {!isDemo && !credential && (
          <Alert variant="info" className="mb-8">
            <strong>Complete your profile</strong> to see personalised CPD requirements.{" "}
            <a href="/onboarding" className="font-medium underline">Go to onboarding</a>
          </Alert>
        )}

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Hours Completed"
            value={progress.totalHoursCompleted}
            sub={progress.hoursRequired > 0 ? `of ${progress.hoursRequired} required` : "logged"}
          />
          <StatsCard
            label="Hours Remaining"
            value={hoursRemaining}
            valueColor={urgencyColor}
            sub="to complete this cycle"
          />
          <Card>
            <div className="text-sm font-medium text-gray-500">Progress</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{progress.progressPercent}%</div>
            <div className="mt-3 h-2 rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${progress.progressPercent}%` }} />
            </div>
          </Card>
          <StatsCard
            label="Certificates"
            value={progress.certificateCount}
            valueColor="text-emerald-600"
            sub="in your vault"
          />
        </div>

        {/* CPD Gap Analysis */}
        {credential && (progress.ethicsRequired > 0 || progress.structuredRequired > 0) && (
          <Card className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">CPD Gap Analysis - {credential.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{credential.body} ({credential.region})</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <ProgressBar
                label="Total Hours"
                completed={progress.totalHoursCompleted}
                required={progress.hoursRequired}
                size="md"
              />
              {progress.ethicsRequired > 0 && (
                <ProgressBar
                  label="Ethics Hours"
                  completed={progress.ethicsHoursCompleted}
                  required={progress.ethicsRequired}
                  size="md"
                />
              )}
              {progress.structuredRequired > 0 && (
                <ProgressBar
                  label="Structured/Verifiable"
                  completed={progress.structuredHoursCompleted}
                  required={progress.structuredRequired}
                  size="md"
                />
              )}
            </div>
          </Card>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Activities */}
          <div className="lg:col-span-2">
            <Card padding="sm" className="p-0">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">CPD Activities</h2>
                  {!isDemo && (
                    <Button onClick={() => setShowLogForm(true)}>+ Log activity</Button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {["all", "general", "ethics", "technical"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                        categoryFilter === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {activities.length === 0 ? (
                <div className="px-6 py-12">
                  <EmptyState
                    message="No activities logged yet."
                    action={!isDemo ? <button onClick={() => setShowLogForm(true)} className="text-sm font-medium text-blue-600 underline">Log your first CPD activity</button> : undefined}
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50" onClick={() => !isDemo && handleOpenAllocations(activity.id)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{activity.title}</span>
                          {activity.category === "ethics" && (
                            <Badge variant="purple" shape="rounded">ethics</Badge>
                          )}
                          {activity.source === "auto" && (
                            <Badge variant="green" shape="rounded">verified</Badge>
                          )}
                          {activity.evidenceStrength === "provider_verified" && activity.source !== "auto" && (
                            <Badge variant="blue" shape="rounded">provider verified</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          {activity.provider && <span>{activity.provider}</span>}
                          <span>{activity.hours}h</span>
                          <span className="capitalize">{activity.activityType}</span>
                          <span>{new Date(activity.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <StatusBadge status={activity.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile card */}
            <Card>
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
            </Card>

            {/* Deadlines */}
            {deadline.daysUntilDeadline !== null && (
              <Card>
                <h3 className="text-sm font-semibold text-gray-900">Upcoming Deadlines</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{credential?.name} cycle ends</span>
                    <Badge
                      variant={deadline.daysUntilDeadline < 60 ? "red" : deadline.daysUntilDeadline < 180 ? "amber" : "gray"}
                      shape="rounded"
                    >
                      {deadline.daysUntilDeadline}d
                    </Badge>
                  </div>
                  {progress.ethicsRequired > 0 && progress.ethicsHoursCompleted < progress.ethicsRequired && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Ethics requirement</span>
                      <Badge variant="amber" shape="rounded">
                        {progress.ethicsRequired - progress.ethicsHoursCompleted}h remaining
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Quick actions */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
              <div className="mt-4 space-y-2">
                {!isDemo && (
                  <Button variant="secondary" fullWidth className="justify-start" onClick={() => setShowLogForm(true)}>
                    Log CPD activity
                  </Button>
                )}
                <Button
                  variant="secondary"
                  fullWidth
                  className="justify-start"
                  onClick={() => handleExport("pdf")}
                  disabled={exporting !== null || isDemo}
                >
                  {exporting === "pdf" ? "Exporting..." : "Export audit report (PDF)"}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  className="justify-start"
                  onClick={() => handleExport("csv")}
                  disabled={exporting !== null || isDemo}
                >
                  {exporting === "csv" ? "Exporting..." : "Export audit report (CSV)"}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  className="justify-start"
                  onClick={() => setShowAuditPack(true)}
                  disabled={isDemo}
                >
                  Export audit pack (ZIP)
                </Button>
                {!isDemo && (
                  <Button variant="secondary" fullWidth className="justify-start" onClick={() => setShowUploadForm(true)}>
                    Upload evidence
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Upload Evidence Modal */}
      <Modal open={showUploadForm} onClose={() => { setShowUploadForm(false); setUploadError(""); setUploadFile(null); }}>
        <ModalHeader title="Upload Evidence" onClose={() => { setShowUploadForm(false); setUploadError(""); setUploadFile(null); }} />
        <ModalBody>
          <FileInput
            label="File *"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
            onChange={(e) => setUploadFile((e.target as HTMLInputElement).files?.[0] ?? null)}
            hint="PDF, JPEG, PNG, WebP, or Text. Max 10MB."
          />
          <Select
            label="Link to CPD activity (optional)"
            value={uploadRecordId}
            onChange={(e) => setUploadRecordId(e.target.value)}
          >
            <option value="">-- No linked activity --</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.hours}h - {new Date(a.date).toLocaleDateString()})
              </option>
            ))}
          </Select>
        </ModalBody>
        {uploadError && <Alert variant="error" className="mt-4">{uploadError}</Alert>}
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowUploadForm(false); setUploadError(""); setUploadFile(null); }}>
            Cancel
          </Button>
          <Button onClick={handleUploadEvidence} disabled={uploadSaving || !uploadFile}>
            {uploadSaving ? "Uploading..." : "Upload"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Audit Pack Modal */}
      <Modal open={showAuditPack} onClose={() => setShowAuditPack(false)}>
        <ModalHeader title="Export Audit Pack" onClose={() => setShowAuditPack(false)} />
        <ModalBody>
          <p className="text-sm text-gray-600">
            Download a ZIP containing your transcript PDF, activity CSV, summary, and all evidence files.
          </p>
          <Select
            label="Minimum evidence strength"
            value={auditMinStrength}
            onChange={(e) => setAuditMinStrength(e.target.value)}
          >
            <option value="manual_only">All records (manual and above)</option>
            <option value="url_only">URL verified and above</option>
            <option value="certificate_attached">Certificate attached and above</option>
            <option value="provider_verified">Provider verified only</option>
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="From date" type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} />
            <Input label="To date" type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAuditPack(false)}>Cancel</Button>
          <Button onClick={handleAuditPackExport} disabled={exporting === "zip"}>
            {exporting === "zip" ? "Generating..." : "Download audit pack"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Log Activity Modal */}
      <Modal open={showLogForm} onClose={() => { setShowLogForm(false); setLogError(""); }}>
        <ModalHeader title="Log CPD Activity" onClose={() => { setShowLogForm(false); setLogError(""); }} />
        <ModalBody>
          <div>
            <Input
              label="Activity title *"
              type="text"
              value={logForm.title}
              onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
              list="recent-titles"
              placeholder="e.g. Ethics in Financial Planning"
            />
            {/* Autocomplete from previously logged activity titles */}
            <datalist id="recent-titles">
              {[...new Set(activities.map((a) => a.title))].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hours *"
              type="number"
              step="0.5"
              min="0.5"
              value={logForm.hours}
              onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })}
              placeholder="2"
            />
            <Input
              label="Date *"
              type="date"
              value={logForm.date}
              onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
            />
          </div>
          <div>
            <Input
              label="Provider"
              type="text"
              value={logForm.provider}
              onChange={(e) => setLogForm({ ...logForm, provider: e.target.value })}
              list="recent-providers"
              placeholder="e.g. CFP Board, CII, Kitces.com"
            />
            {/* Autocomplete from previously used providers to reduce re-typing */}
            <datalist id="recent-providers">
              {[...new Set(activities.map((a) => a.provider).filter(Boolean))].map((p) => (
                <option key={p} value={p!} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Activity type *"
              value={logForm.activityType}
              onChange={(e) => setLogForm({ ...logForm, activityType: e.target.value })}
            >
              <option value="structured">Structured</option>
              <option value="unstructured">Unstructured</option>
              <option value="verifiable">Verifiable</option>
              <option value="non-verifiable">Non-verifiable</option>
              <option value="participatory">Participatory</option>
            </Select>
            <Select
              label="Category"
              value={logForm.category}
              onChange={(e) => setLogForm({ ...logForm, category: e.target.value })}
            >
              <option value="general">General</option>
              <option value="ethics">Ethics</option>
              <option value="technical">Technical</option>
              <option value="regulatory_element">Regulatory Element</option>
              <option value="firm_element">Firm Element</option>
            </Select>
          </div>
          <Textarea
            label="Notes"
            value={logForm.notes}
            onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
            rows={2}
            placeholder="Optional notes about this activity"
          />
        </ModalBody>
        {logError && <Alert variant="error" className="mt-4">{logError}</Alert>}
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowLogForm(false); setLogError(""); }}>
            Cancel
          </Button>
          <Button onClick={handleLogActivity} disabled={logSaving || !logForm.title || !logForm.hours || !logForm.date}>
            {logSaving ? "Saving..." : "Log activity"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Allocation Modal */}
      <Modal open={!!allocRecordId} onClose={() => { setAllocRecordId(null); setAllocations([]); }}>
        <ModalHeader title="Allocate Hours" onClose={() => { setAllocRecordId(null); setAllocations([]); }} />
        <ModalBody>
          {(() => {
            const record = allActivities.find((a) => a.id === allocRecordId);
            if (!record) return null;
            const totalAllocated = allocations.reduce((s, a) => s + a.hours, 0);
            return (
              <div className="space-y-4">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{record.title}</span>
                  <span className="ml-2 text-gray-500">{record.hours}h total</span>
                </div>
                {userCredentials.length === 0 ? (
                  <Alert variant="info">No credentials configured. Complete onboarding first.</Alert>
                ) : (
                  <>
                    {allocations.map((alloc, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Select
                          label={i === 0 ? "Credential" : ""}
                          value={alloc.userCredentialId}
                          onChange={(e) => {
                            const updated = [...allocations];
                            const cred = userCredentials.find((c) => c.id === e.target.value);
                            updated[i] = { ...alloc, userCredentialId: e.target.value, credentialName: cred?.credentialName ?? "" };
                            setAllocations(updated);
                          }}
                        >
                          {userCredentials.map((c) => (
                            <option key={c.id} value={c.id}>{c.credentialName}</option>
                          ))}
                        </Select>
                        <Input
                          label={i === 0 ? "Hours" : ""}
                          type="number"
                          step="0.5"
                          min="0"
                          max={String(record.hours)}
                          value={String(alloc.hours)}
                          onChange={(e) => {
                            const updated = [...allocations];
                            updated[i] = { ...alloc, hours: parseFloat(e.target.value) || 0 };
                            setAllocations(updated);
                          }}
                        />
                        {allocations.length > 1 && (
                          <button
                            onClick={() => setAllocations(allocations.filter((_, j) => j !== i))}
                            className="mt-5 text-sm text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    {userCredentials.length > allocations.length && (
                      <button
                        onClick={() => {
                          const used = new Set(allocations.map((a) => a.userCredentialId));
                          const next = userCredentials.find((c) => !used.has(c.id));
                          if (next) {
                            setAllocations([...allocations, { userCredentialId: next.id, hours: 0, credentialName: next.credentialName }]);
                          }
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        + Add credential
                      </button>
                    )}
                    <div className="text-xs text-gray-500">
                      Allocated: {totalAllocated}h / {record.hours}h
                      {totalAllocated > record.hours && (
                        <span className="ml-2 text-red-500">Exceeds record hours</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setAllocRecordId(null); setAllocations([]); }}>Cancel</Button>
          <Button
            onClick={handleSaveAllocations}
            disabled={allocSaving || allocations.reduce((s, a) => s + a.hours, 0) <= 0}
          >
            {allocSaving ? "Saving..." : "Save allocations"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
