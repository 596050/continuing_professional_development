"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Button, Spinner, AppNav, Card, Badge,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Input, Select, Textarea, Alert, EmptyState,
} from "@/components/ui";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  publishStatus: string;
  durationMinutes: number | null;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  live_webinar: "Live webinar",
  on_demand_video: "On-demand video",
  article: "Article",
  assessment_only: "Assessment",
  bundle: "Bundle",
};

const emptyForm = {
  type: "on_demand_video",
  title: "",
  description: "",
  durationMinutes: "",
  tags: "",
  jurisdictions: "",
};

export default function ActivityAdminPage() {
  const { data: session, status: authStatus } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");
      const res = await fetch(`/api/activities?${params}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchActivities();
  }, [authStatus, fetchActivities]);

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        title: form.title,
        description: form.description || null,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null,
      };
      if (form.tags) body.tags = form.tags.split(",").map((t) => t.trim());
      if (form.jurisdictions) body.jurisdictions = form.jurisdictions.split(",").map((j) => j.trim());

      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create");
      }
      setShowCreate(false);
      setForm(emptyForm);
      fetchActivities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/activities/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (res.ok) fetchActivities();
    } catch {
      // Silently fail
    }
  };

  if (authStatus === "loading" || loading) return <Spinner text="Loading..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Activity Admin</h1>
          <p className="mt-2 text-gray-600">Please sign in.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Admin</h1>
            <p className="mt-1 text-sm text-gray-600">Create, edit, and publish CPD activities.</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ New activity</Button>
        </div>

        <div className="mt-6 flex gap-2">
          {["", "draft", "published", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s || "all"}
            </button>
          ))}
        </div>

        {activities.length === 0 ? (
          <div className="mt-8">
            <EmptyState message="No activities found." />
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            <p className="text-sm text-gray-500">{total} activities</p>
            {activities.map((a) => (
              <Card key={a.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                      <Badge
                        variant={a.publishStatus === "published" ? "green" : a.publishStatus === "draft" ? "amber" : "gray"}
                        shape="rounded"
                      >
                        {a.publishStatus}
                      </Badge>
                      <Badge variant="blue" shape="rounded">
                        {typeLabels[a.type] ?? a.type}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {a.durationMinutes ? `${a.durationMinutes} min` : "No duration"} &middot;{" "}
                      {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {a.publishStatus === "draft" && (
                      <Button size="sm" variant="secondary" onClick={() => handlePublish(a.id)}>
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Activity Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setError(""); }}>
        <ModalHeader title="Create Activity" onClose={() => { setShowCreate(false); setError(""); }} />
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Title *"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Ethics in Financial Planning"
            />
            <Select
              label="Type *"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {Object.entries(typeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Duration (minutes)"
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              />
              <Input
                label="Tags (comma-separated)"
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="ethics, regulation"
              />
            </div>
            <Input
              label="Jurisdictions (comma-separated)"
              type="text"
              value={form.jurisdictions}
              onChange={(e) => setForm({ ...form, jurisdictions: e.target.value })}
              placeholder="US, UK, AU"
            />
          </div>
          {error && <Alert variant="error" className="mt-4">{error}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowCreate(false); setError(""); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !form.title}>
            {saving ? "Creating..." : "Create activity"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
