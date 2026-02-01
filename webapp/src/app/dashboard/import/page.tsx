"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Button, Spinner, AppNav, Card, Badge,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Select, Alert, EmptyState,
} from "@/components/ui";

interface TranscriptSource {
  id: string;
  code: string;
  name: string;
  format: string;
}

interface ParsedEntry {
  title: string;
  provider: string | null;
  hours: number;
  date: string;
  category: string | null;
  activityType: string;
  source: string;
}

interface ImportRecord {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceCode: string;
  status: string;
  entryCount: number;
  createdAt: string;
}

export default function TranscriptImportPage() {
  const { data: session, status: authStatus } = useSession();
  const [sources, setSources] = useState<TranscriptSource[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [selectedSource, setSelectedSource] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Preview state
  const [previewImportId, setPreviewImportId] = useState<string | null>(null);
  const [previewEntries, setPreviewEntries] = useState<(ParsedEntry & { isDuplicate?: boolean })[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ created: number; skipped: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [srcRes, impRes] = await Promise.all([
        fetch("/api/transcripts/import?action=sources").then((r) => r.ok ? r.json() : { sources: [] }),
        fetch("/api/transcripts/import").then((r) => r.ok ? r.json() : { imports: [] }),
      ]);
      setSources(srcRes.sources ?? []);
      setImports(impRes.imports ?? []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchData();
  }, [authStatus, fetchData]);

  const handleUpload = async () => {
    if (!selectedSource) return;
    setUploading(true);
    setUploadError("");
    try {
      let content = uploadContent;
      if (uploadFile) {
        content = await uploadFile.text();
      }
      if (!content.trim()) {
        throw new Error("Please paste transcript content or select a file");
      }
      const res = await fetch("/api/transcripts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCode: selectedSource,
          content,
          fileName: uploadFile?.name ?? `${selectedSource}-import.csv`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      const data = await res.json();
      setUploadContent("");
      setUploadFile(null);
      setSelectedSource("");
      fetchData();
      // Auto-open preview
      if (data.importId) {
        handlePreview(data.importId);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (importId: string) => {
    setPreviewImportId(importId);
    setPreviewLoading(true);
    setConfirmResult(null);
    try {
      const res = await fetch(`/api/transcripts/import/${importId}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewEntries(data.entries ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewImportId) return;
    setConfirmLoading(true);
    try {
      const entries = previewEntries.map((e, i) => ({
        index: i,
        include: !e.isDuplicate,
      }));
      const res = await fetch(`/api/transcripts/import/${previewImportId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfirmResult({ created: data.created, skipped: data.skipped });
        fetchData();
      }
    } catch {
      // Silently fail
    } finally {
      setConfirmLoading(false);
    }
  };

  if (authStatus === "loading" || loading) return <Spinner text="Loading imports..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Transcript Import</h1>
          <p className="mt-2 text-gray-600">Please sign in to import transcripts.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  const sourceMap: Record<string, string> = {};
  for (const s of sources) {
    sourceMap[s.code] = s.name;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Transcript Import Hub</h1>
        <p className="mt-1 text-sm text-gray-600">
          Import CPD records from external transcript sources.
        </p>

        {/* Upload section */}
        <Card className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">Upload transcript</h2>
          <p className="mt-1 text-sm text-gray-500">
            Select a source, then paste your transcript CSV or upload a file.
          </p>

          <div className="mt-4 space-y-4">
            <Select
              label="Source"
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="">-- Select transcript source --</option>
              {sources.map((s) => (
                <option key={s.code} value={s.code}>{s.name} ({s.format.toUpperCase()})</option>
              ))}
              <option value="GENERIC">Other / Generic CSV</option>
            </Select>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Paste content or upload file
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                rows={5}
                placeholder="Paste CSV content here..."
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">or</span>
                <input
                  type="file"
                  accept=".csv,.txt,.json"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
            </div>
          </div>

          {uploadError && <Alert variant="error" className="mt-4">{uploadError}</Alert>}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedSource || (!uploadContent.trim() && !uploadFile)}
            >
              {uploading ? "Parsing..." : "Upload & parse"}
            </Button>
          </div>
        </Card>

        {/* Open Badges Import */}
        <Card className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">Open Badges Import</h2>
          <p className="mt-1 text-sm text-gray-500">
            Import CPD records from Open Badges 2.0 JSON-LD assertions. Paste the badge JSON or upload a .json file.
          </p>
          <div className="mt-4">
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={4}
              placeholder='{"@context":"https://w3id.org/openbadges/v2","type":"Assertion",...}'
              id="openbadges-input"
            />
            <div className="mt-3 flex items-center gap-3">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    file.text().then((text) => {
                      const el = document.getElementById("openbadges-input") as HTMLTextAreaElement;
                      if (el) el.value = text;
                    });
                  }
                }}
                className="text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const el = document.getElementById("openbadges-input") as HTMLTextAreaElement;
                  if (!el?.value.trim()) return;
                  try {
                    const badge = JSON.parse(el.value);
                    // Extract data from Open Badges assertion
                    const title = badge.badge?.name ?? badge.name ?? "Open Badge";
                    const issuer = badge.badge?.issuer?.name ?? badge.issuer?.name ?? null;
                    const dateStr = badge.issuedOn ?? badge.badge?.issuedOn ?? new Date().toISOString();

                    const res = await fetch("/api/cpd-records", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title,
                        provider: issuer,
                        hours: 1,
                        date: dateStr.split("T")[0],
                        activityType: "structured",
                        category: "general",
                        notes: `Imported from Open Badges assertion. Badge ID: ${badge.id ?? "unknown"}`,
                      }),
                    });
                    if (res.ok) {
                      el.value = "";
                      fetchData();
                    }
                  } catch {
                    // Invalid JSON
                  }
                }}
              >
                Import badge
              </Button>
            </div>
          </div>
        </Card>

        {/* Previous imports */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Import history</h2>
          {imports.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="No imports yet. Upload a transcript above to get started." />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {imp.sourceName || imp.sourceCode}
                      </h3>
                      <Badge
                        variant={imp.status === "imported" ? "green" : imp.status === "parsed" ? "amber" : "gray"}
                        shape="rounded"
                      >
                        {imp.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {imp.entryCount} entries &middot; {new Date(imp.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {imp.status === "parsed" && (
                      <Button size="sm" variant="secondary" onClick={() => handlePreview(imp.id)}>
                        Review & import
                      </Button>
                    )}
                    {imp.status === "imported" && (
                      <span className="text-xs text-emerald-600 font-medium">Imported</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      <Modal open={!!previewImportId} onClose={() => { setPreviewImportId(null); setConfirmResult(null); }}>
        <ModalHeader title="Review Parsed Entries" onClose={() => { setPreviewImportId(null); setConfirmResult(null); }} />
        <ModalBody>
          {previewLoading ? (
            <Spinner text="Loading entries..." />
          ) : confirmResult ? (
            <Alert variant="success">
              Import complete: {confirmResult.created} records created, {confirmResult.skipped} skipped.
            </Alert>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {previewEntries.length === 0 ? (
                <p className="text-sm text-gray-500">No entries parsed from this transcript.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs text-gray-500">
                    <tr>
                      <th className="pb-2">Title</th>
                      <th className="pb-2">Hours</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewEntries.map((entry, i) => (
                      <tr key={i} className={entry.isDuplicate ? "opacity-50" : ""}>
                        <td className="py-2 pr-3 font-medium text-gray-900">{entry.title}</td>
                        <td className="py-2 pr-3">{entry.hours}h</td>
                        <td className="py-2 pr-3">{entry.date}</td>
                        <td className="py-2">
                          {entry.isDuplicate ? (
                            <Badge variant="amber" shape="rounded">Duplicate</Badge>
                          ) : (
                            <Badge variant="green" shape="rounded">New</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </ModalBody>
        {!confirmResult && previewEntries.length > 0 && (
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setPreviewImportId(null); setConfirmResult(null); }}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={confirmLoading}>
              {confirmLoading ? "Importing..." : `Import ${previewEntries.filter((e) => !e.isDuplicate).length} records`}
            </Button>
          </ModalFooter>
        )}
      </Modal>
    </div>
  );
}
