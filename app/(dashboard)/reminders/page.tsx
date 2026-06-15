"use client";
import { useEffect, useState } from "react";
import { generateICS } from "@/lib/ics";

interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  completed: boolean;
  createdAt: string;
}

interface CalendarConnection {
  provider: "GOOGLE" | "NOTION";
  notionDbId: string | null;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const [pushingId, setPushingId] = useState<string | null>(null);
  const [pushTarget, setPushTarget] = useState<"apple" | "google" | "notion" | null>(null);

  async function load() {
    const [remRes, conRes] = await Promise.all([
      fetch("/api/reminders"),
      fetch("/api/integrations"),
    ]);
    if (remRes.ok) setReminders(await remRes.json());
    if (conRes.ok) setConnections(await conRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes: notes || undefined, dueAt: dueAt || undefined }),
    });
    if (res.ok) {
      const r = await res.json();
      setReminders((prev) => [r, ...prev]);
      setTitle("");
      setNotes("");
      setDueAt("");
    }
    setSaving(false);
  }

  async function toggleComplete(id: string, completed: boolean) {
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, completed: !completed } : r)));
  }

  async function deleteReminder(id: string) {
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  async function pushToCalendar(reminder: Reminder, target: "apple" | "google" | "notion") {
    setPushingId(reminder.id);
    setPushTarget(target);

    if (target === "apple") {
      const ics = generateICS({
        title: reminder.title,
        notes: reminder.notes ?? undefined,
        dueAt: reminder.dueAt ? new Date(reminder.dueAt) : new Date(),
      });
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reminder.title.replace(/\s+/g, "-")}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const res = await fetch(`/api/reminders/${reminder.id}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: target.toUpperCase() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Failed to push reminder");
      } else {
        const d = await res.json();
        if (d.url) window.open(d.url, "_blank");
      }
    }

    setPushingId(null);
    setPushTarget(null);
  }

  const hasGoogle = connections.some((c) => c.provider === "GOOGLE");
  const hasNotion = connections.some((c) => c.provider === "NOTION");

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl">Reminders</h1>
        <p className="text-zinc-400 text-sm mt-1">Set reminders and push them to your calendar or Notion.</p>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="rounded-xl p-5 border border-zinc-800/60 mb-8 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
        <h2 className="font-display font-semibold text-white text-sm">New reminder</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to remember?"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-600 transition-colors text-sm"
          required
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-600 transition-colors text-sm resize-none"
        />
        <div className="flex items-center gap-3">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-600 transition-colors text-sm"
          />
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            {saving ? "Saving…" : "Add reminder"}
          </button>
        </div>
      </form>

      {/* Integration notice */}
      {!hasGoogle && !hasNotion && (
        <div className="rounded-xl p-4 border border-zinc-800/60 mb-6 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-zinc-400 text-sm">Connect Google Calendar or Notion to push reminders.</p>
          <a href="/settings/integrations" className="text-brand-400 text-sm hover:text-brand-300 transition-colors">Connect →</a>
        </div>
      )}

      {/* Reminders list */}
      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : reminders.length === 0 ? (
        <p className="text-zinc-500 text-sm">No reminders yet.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="rounded-xl p-4 border border-zinc-800/60"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleComplete(r.id, r.completed)}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      r.completed ? "bg-brand-600 border-brand-600" : "border-zinc-600 hover:border-brand-600"
                    }`}
                  >
                    {r.completed && <span className="text-white text-xs">✓</span>}
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${r.completed ? "text-zinc-500 line-through" : "text-white"}`}>{r.title}</p>
                    {r.notes && <p className="text-zinc-500 text-xs mt-0.5">{r.notes}</p>}
                    {r.dueAt && (
                      <p className="text-zinc-500 text-xs mt-1 font-mono">
                        {new Date(r.dueAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Push actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    title="Download .ics for Apple Calendar"
                    onClick={() => pushToCalendar(r, "apple")}
                    disabled={pushingId === r.id}
                    className="text-xs px-2 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  >
                    {pushingId === r.id && pushTarget === "apple" ? "…" : "Apple"}
                  </button>
                  {hasGoogle && (
                    <button
                      title="Add to Google Calendar"
                      onClick={() => pushToCalendar(r, "google")}
                      disabled={pushingId === r.id}
                      className="text-xs px-2 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                    >
                      {pushingId === r.id && pushTarget === "google" ? "…" : "Google"}
                    </button>
                  )}
                  {hasNotion && (
                    <button
                      title="Add to Notion"
                      onClick={() => pushToCalendar(r, "notion")}
                      disabled={pushingId === r.id}
                      className="text-xs px-2 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                    >
                      {pushingId === r.id && pushTarget === "notion" ? "…" : "Notion"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteReminder(r.id)}
                    className="text-xs px-2 py-1 rounded-lg text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
