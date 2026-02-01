"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Button, Spinner, AppNav,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Input, Select, Textarea, Alert, Badge, EmptyState,
} from "@/components/ui";

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string | null;
  triggerDate: string;
  channel: string;
  status: string;
  credentialId: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface NewReminder {
  type: string;
  title: string;
  message: string;
  triggerDate: string;
  channel: string;
}

const emptyReminder: NewReminder = {
  type: "deadline",
  title: "",
  message: "",
  triggerDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  channel: "email",
};

export default function RemindersPage() {
  const { data: session, status: authStatus } = useSession();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewReminder>(emptyReminder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchReminders = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders");
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchReminders();
  }, [authStatus, fetchReminders]);

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create reminder");
      }
      setShowForm(false);
      setForm(emptyReminder);
      fetchReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      fetchReminders();
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      fetchReminders();
    } catch {
      // Silently fail
    }
  };

  const handleCalendarExport = async (id?: string) => {
    const url = id ? `/api/reminders/ics?id=${id}` : "/api/reminders/ics";
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? "reminders.ics";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      // Silently fail
    }
  };

  const closeForm = () => { setShowForm(false); setError(""); };

  if (authStatus === "loading" || loading) return <Spinner text="Loading reminders..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="mt-2 text-gray-600">Please sign in to manage reminders.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? reminders : reminders.filter((r) => r.type === filter);
  const pending = reminders.filter((r) => r.status === "pending");
  const upcoming = pending.filter((r) => new Date(r.triggerDate) > new Date());
  const overdue = pending.filter((r) => new Date(r.triggerDate) <= new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reminders & Deadlines</h1>
            <p className="mt-1 text-sm text-gray-600">
              {pending.length} pending reminder{pending.length !== 1 ? "s" : ""}
              {overdue.length > 0 && <span className="ml-1 font-medium text-red-600">({overdue.length} overdue)</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {pending.length > 0 && (
              <Button variant="secondary" onClick={() => handleCalendarExport()}>
                Export all to calendar
              </Button>
            )}
            <Button onClick={() => setShowForm(true)}>+ Add reminder</Button>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          {["all", "deadline", "progress", "custom"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Overdue section */}
        {overdue.length > 0 && filter === "all" && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-red-700">Overdue</h2>
            <div className="mt-2 space-y-2">
              {overdue.map((r) => (
                <ReminderCard key={r.id} reminder={r} overdue onDismiss={handleDismiss} onDelete={handleDelete} onCalendar={handleCalendarExport} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming / All */}
        <div className="mt-6">
          {filter === "all" && upcoming.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-700">Upcoming</h2>
          )}
          {filtered.length === 0 ? (
            <EmptyState
              message="No reminders found."
              action={<button onClick={() => setShowForm(true)} className="text-sm font-medium text-blue-600 underline">Create your first reminder</button>}
            />
          ) : (
            <div className="mt-2 space-y-2">
              {(filter === "all" ? upcoming : filtered).map((r) => (
                <ReminderCard key={r.id} reminder={r} onDismiss={handleDismiss} onDelete={handleDelete} onCalendar={handleCalendarExport} />
              ))}
              {/* Show dismissed/sent if they exist */}
              {filter === "all" && reminders.filter((r) => r.status !== "pending").length > 0 && (
                <>
                  <h2 className="mt-6 text-sm font-semibold text-gray-400">Past</h2>
                  {reminders.filter((r) => r.status !== "pending").map((r) => (
                    <ReminderCard key={r.id} reminder={r} onDismiss={handleDismiss} onDelete={handleDelete} onCalendar={handleCalendarExport} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Reminder Modal */}
      <Modal open={showForm} onClose={closeForm}>
        <ModalHeader title="New Reminder" onClose={closeForm} />
        <ModalBody>
          <Input
            label="Title *"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. CFP renewal deadline"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="deadline">Deadline</option>
              <option value="progress">Progress</option>
              <option value="custom">Custom</option>
            </Select>
            <Select label="Channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option value="email">Email</option>
              <option value="calendar">Calendar</option>
              <option value="both">Both</option>
            </Select>
          </div>
          <Input
            label="Trigger date *"
            type="date"
            value={form.triggerDate}
            onChange={(e) => setForm({ ...form, triggerDate: e.target.value })}
          />
          <Textarea
            label="Message (optional)"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={2}
            placeholder="Optional description or notes"
          />
        </ModalBody>
        {error && <Alert variant="error" className="mt-4">{error}</Alert>}
        <ModalFooter>
          <Button variant="secondary" onClick={closeForm}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !form.title || !form.triggerDate}>
            {saving ? "Creating..." : "Create reminder"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function ReminderCard({
  reminder,
  overdue,
  onDismiss,
  onDelete,
  onCalendar,
}: {
  reminder: Reminder;
  overdue?: boolean;
  onDismiss: (id: string) => void;
  onDelete: (id: string) => void;
  onCalendar: (id: string) => void;
}) {
  const typeVariant: Record<string, "red" | "blue" | "gray"> = {
    deadline: "red",
    progress: "blue",
    custom: "gray",
  };

  const statusVariant: Record<string, "amber" | "green" | "gray" | "red"> = {
    pending: "amber",
    sent: "green",
    dismissed: "gray",
    failed: "red",
  };

  const isPending = reminder.status === "pending";

  return (
    <div className={`rounded-lg border bg-white p-4 ${overdue ? "border-red-200" : "border-gray-200"}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={typeVariant[reminder.type] ?? "gray"} shape="rounded" className="capitalize">
              {reminder.type}
            </Badge>
            <Badge variant={statusVariant[reminder.status] ?? "gray"} shape="rounded" className="capitalize">
              {reminder.status}
            </Badge>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-gray-900">{reminder.title}</h3>
          {reminder.message && <p className="mt-1 text-sm text-gray-600">{reminder.message}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span>
              {new Date(reminder.triggerDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="capitalize">{reminder.channel}</span>
          </div>
        </div>

        {isPending && (
          <div className="ml-4 flex gap-1">
            <button onClick={() => onCalendar(reminder.id)} title="Add to calendar" className="cursor-pointer rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </button>
            <button onClick={() => onDismiss(reminder.id)} title="Dismiss" className="cursor-pointer rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button onClick={() => onDelete(reminder.id)} title="Delete" className="cursor-pointer rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
