"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Button, Spinner, AppNav, Badge,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Input, Select, Textarea, FileInput, Alert, EmptyState,
} from "@/components/ui";

interface EvidenceItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  cpdRecordId: string | null;
  kind: string;
  status: string;
  metadata: Record<string, unknown> | null;
  extractedMetadata: Record<string, unknown> | null;
  uploadedAt: string;
}

interface CpdRecordSummary {
  id: string;
  title: string;
  hours: number;
  date: string;
}

export default function EvidenceInboxPage() {
  const { data: session, status: authStatus } = useSession();
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [records, setRecords] = useState<CpdRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState("other");
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Assign modal
  const [assignTarget, setAssignTarget] = useState<EvidenceItem | null>(null);
  const [assignRecordId, setAssignRecordId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  // Create record modal
  const [createFrom, setCreateFrom] = useState<EvidenceItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newHours, setNewHours] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newCategory, setNewCategory] = useState("general");
  const [newProvider, setNewProvider] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchEvidence = useCallback(async () => {
    try {
      const res = await fetch("/api/evidence");
      if (res.ok) {
        const data = await res.json();
        setEvidence(data.evidence ?? []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/cpd-records");
      if (res.ok) {
        const data = await res.json();
        setRecords(
          (data.records ?? []).map((r: { id: string; title: string; hours: number; date: string }) => ({
            id: r.id,
            title: r.title,
            hours: r.hours,
            date: r.date,
          }))
        );
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    Promise.all([fetchEvidence(), fetchRecords()]).finally(() => setLoading(false));
  }, [authStatus, fetchEvidence, fetchRecords]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploadSaving(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("kind", uploadKind);
      const res = await fetch("/api/evidence", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      setShowUpload(false);
      setUploadFile(null);
      setUploadKind("other");
      fetchEvidence();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploadSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignRecordId) return;
    setAssignSaving(true);
    try {
      await fetch(`/api/evidence/${assignTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpdRecordId: assignRecordId }),
      });
      setAssignTarget(null);
      setAssignRecordId("");
      fetchEvidence();
    } catch {
      // Silently fail
    } finally {
      setAssignSaving(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      await fetch(`/api/evidence/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "deleted" }),
      });
      fetchEvidence();
    } catch {
      // Silently fail
    }
  };

  const handleUnassign = async (id: string) => {
    try {
      await fetch(`/api/evidence/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpdRecordId: null }),
      });
      fetchEvidence();
    } catch {
      // Silently fail
    }
  };

  const handleCreateRecord = async () => {
    if (!createFrom) return;
    setCreateSaving(true);
    setCreateError("");
    try {
      const res = await fetch(`/api/evidence/${createFrom.id}/create-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          hours: parseFloat(newHours),
          date: newDate,
          category: newCategory,
          provider: newProvider || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create record");
      }
      setCreateFrom(null);
      setNewTitle("");
      setNewHours("");
      setNewProvider("");
      fetchEvidence();
      fetchRecords();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreateSaving(false);
    }
  };

  if (authStatus === "loading" || loading) return <Spinner text="Loading evidence..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Evidence Inbox</h1>
          <p className="mt-2 text-gray-600">Please sign in to manage evidence.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  const inboxCount = evidence.filter((e) => e.status === "inbox").length;
  const assignedCount = evidence.filter((e) => e.status === "assigned").length;

  let filtered = evidence;
  if (filter !== "all") filtered = filtered.filter((e) => e.status === filter);
  if (kindFilter !== "all") filtered = filtered.filter((e) => e.kind === kindFilter);

  const kindVariant: Record<string, "blue" | "green" | "amber" | "purple" | "gray"> = {
    certificate: "green",
    transcript: "blue",
    agenda: "amber",
    screenshot: "purple",
    other: "gray",
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Evidence Inbox</h1>
            <p className="mt-1 text-sm text-gray-600">
              {inboxCount} in inbox, {assignedCount} assigned to records
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)}>+ Upload evidence</Button>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          {["all", "inbox", "assigned"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f}{f === "inbox" ? ` (${inboxCount})` : f === "assigned" ? ` (${assignedCount})` : ""}
            </button>
          ))}
          <span className="mx-2 border-l border-gray-300" />
          {["all", "certificate", "transcript", "agenda", "screenshot", "other"].map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                kindFilter === k ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Evidence list */}
        {filtered.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              message={filter === "inbox" ? "Your inbox is empty." : "No evidence found."}
              action={
                <button onClick={() => setShowUpload(true)} className="text-sm font-medium text-blue-600 underline">
                  Upload your first evidence file
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={kindVariant[item.kind] ?? "gray"} shape="rounded" className="capitalize">
                      {item.kind}
                    </Badge>
                    <Badge
                      variant={item.status === "inbox" ? "amber" : item.status === "assigned" ? "green" : "gray"}
                      shape="rounded"
                      className="capitalize"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-gray-900">{item.fileName}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatSize(item.fileSize)}</span>
                    <span className="uppercase">{item.fileType}</span>
                    <span>{new Date(item.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>

                <div className="ml-4 flex gap-1">
                  {item.status === "inbox" && (
                    <>
                      <button
                        onClick={() => setAssignTarget(item)}
                        title="Assign to record"
                        className="cursor-pointer rounded px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => {
                          setCreateFrom(item);
                          // Pre-fill from extracted metadata if available
                          const meta = item.extractedMetadata;
                          if (meta) {
                            if (meta.title) setNewTitle(meta.title as string);
                            if (meta.hours) setNewHours(String(meta.hours));
                            if (meta.provider) setNewProvider(meta.provider as string);
                          }
                        }}
                        title="Create CPD record from this evidence"
                        className="cursor-pointer rounded px-3 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50"
                      >
                        Create record
                      </button>
                    </>
                  )}
                  {item.status === "assigned" && (
                    <button
                      onClick={() => handleUnassign(item.id)}
                      title="Unassign from record"
                      className="cursor-pointer rounded px-3 py-1.5 text-xs font-medium text-amber-600 transition hover:bg-amber-50"
                    >
                      Unassign
                    </button>
                  )}
                  <button
                    onClick={() => handleSoftDelete(item.id)}
                    title="Remove"
                    className="cursor-pointer rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => { setShowUpload(false); setUploadError(""); setUploadFile(null); }}>
        <ModalHeader title="Upload Evidence" onClose={() => { setShowUpload(false); setUploadError(""); setUploadFile(null); }} />
        <ModalBody>
          <FileInput
            label="File *"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
            onChange={(e) => setUploadFile((e.target as HTMLInputElement).files?.[0] ?? null)}
            hint="PDF, JPEG, PNG, WebP, or Text. Max 10MB."
          />
          <Select label="Evidence type" value={uploadKind} onChange={(e) => setUploadKind(e.target.value)}>
            <option value="certificate">Certificate</option>
            <option value="transcript">Transcript</option>
            <option value="agenda">Agenda</option>
            <option value="screenshot">Screenshot</option>
            <option value="other">Other</option>
          </Select>
        </ModalBody>
        {uploadError && <Alert variant="error" className="mt-4">{uploadError}</Alert>}
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowUpload(false); setUploadError(""); setUploadFile(null); }}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploadSaving || !uploadFile}>
            {uploadSaving ? "Uploading..." : "Upload to inbox"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Assign Modal */}
      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)}>
        <ModalHeader title="Assign to CPD Record" onClose={() => setAssignTarget(null)} />
        <ModalBody>
          <p className="text-sm text-gray-600">
            Assign <strong>{assignTarget?.fileName}</strong> to an existing CPD record.
          </p>
          <Select label="CPD Record" value={assignRecordId} onChange={(e) => setAssignRecordId(e.target.value)}>
            <option value="">-- Select a record --</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.hours}h - {new Date(r.date).toLocaleDateString()})
              </option>
            ))}
          </Select>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setAssignTarget(null)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={assignSaving || !assignRecordId}>
            {assignSaving ? "Assigning..." : "Assign"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Create Record from Evidence Modal */}
      <Modal open={!!createFrom} onClose={() => { setCreateFrom(null); setCreateError(""); }}>
        <ModalHeader title="Create CPD Record from Evidence" onClose={() => { setCreateFrom(null); setCreateError(""); }} />
        <ModalBody>
          <p className="mb-4 text-sm text-gray-600">
            Create a new CPD record and automatically link <strong>{createFrom?.fileName}</strong> to it.
          </p>
          <Input
            label="Activity title *"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Ethics in Financial Planning"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hours *"
              type="number"
              step="0.5"
              min="0.5"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
              placeholder="2"
            />
            <Input
              label="Date *"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Provider"
              type="text"
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              placeholder="e.g. CFP Board"
            />
            <Select label="Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="ethics">Ethics</option>
              <option value="technical">Technical</option>
              <option value="regulatory_element">Regulatory Element</option>
              <option value="firm_element">Firm Element</option>
            </Select>
          </div>
        </ModalBody>
        {createError && <Alert variant="error" className="mt-4">{createError}</Alert>}
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setCreateFrom(null); setCreateError(""); }}>Cancel</Button>
          <Button onClick={handleCreateRecord} disabled={createSaving || !newTitle || !newHours || !newDate}>
            {createSaving ? "Creating..." : "Create record & link"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
