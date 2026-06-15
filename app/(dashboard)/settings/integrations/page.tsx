"use client";
import { useEffect, useState } from "react";

interface Connection {
  provider: "GOOGLE" | "NOTION";
  notionDbId: string | null;
}

interface NotionDB { id: string; title: string }

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [notionDbs, setNotionDbs] = useState<NotionDB[]>([]);
  const [selectedDb, setSelectedDb] = useState("");
  const [savingDb, setSavingDb] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const data = await res.json();
      setConnections(data);

      const notion = data.find((c: Connection) => c.provider === "NOTION");
      if (notion) {
        const dbRes = await fetch("/api/integrations/notion/databases");
        if (dbRes.ok) {
          const dbs = await dbRes.json();
          setNotionDbs(dbs);
          setSelectedDb(notion.notionDbId ?? "");
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function connectGoogle() {
    const res = await fetch("/api/integrations/google/auth-url");
    const d = await res.json();
    if (d.url) window.location.href = d.url;
  }

  async function connectNotion() {
    const res = await fetch("/api/integrations/notion/auth-url");
    const d = await res.json();
    if (d.url) window.location.href = d.url;
  }

  async function disconnect(provider: "GOOGLE" | "NOTION") {
    await fetch(`/api/integrations/${provider.toLowerCase()}`, { method: "DELETE" });
    await load();
  }

  async function saveNotionDb() {
    setSavingDb(true);
    await fetch("/api/integrations/notion/database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ databaseId: selectedDb }),
    });
    setSavingDb(false);
    await load();
  }

  const hasGoogle = connections.some((c) => c.provider === "GOOGLE");
  const hasNotion = connections.some((c) => c.provider === "NOTION");
  const notionConn = connections.find((c) => c.provider === "NOTION");

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl">Integrations</h1>
        <p className="text-zinc-400 text-sm mt-1">Connect your calendar and note tools to push reminders.</p>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-4">
          {/* Apple Calendar — no OAuth needed */}
          <div className="rounded-xl p-5 border border-zinc-800/60 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍎</span>
              <div>
                <h2 className="font-display font-semibold text-white text-sm">Apple Calendar</h2>
                <p className="text-zinc-500 text-xs">Downloads .ics files — no connection required</p>
              </div>
            </div>
            <span className="font-mono text-xs text-green-400 bg-green-600/15 px-2 py-1 rounded">Ready</span>
          </div>

          {/* Google Calendar */}
          <div className="rounded-xl p-5 border border-zinc-800/60" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <h2 className="font-display font-semibold text-white text-sm">Google Calendar</h2>
                  <p className="text-zinc-500 text-xs">Create events directly in your Google Calendar</p>
                </div>
              </div>
              {hasGoogle ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-green-400 bg-green-600/15 px-2 py-1 rounded">Connected</span>
                  <button onClick={() => disconnect("GOOGLE")} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Disconnect</button>
                </div>
              ) : (
                <button
                  onClick={connectGoogle}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Notion */}
          <div className="rounded-xl p-5 border border-zinc-800/60" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">◻</span>
                <div>
                  <h2 className="font-display font-semibold text-white text-sm">Notion</h2>
                  <p className="text-zinc-500 text-xs">Create pages in a Notion database</p>
                </div>
              </div>
              {hasNotion ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-green-400 bg-green-600/15 px-2 py-1 rounded">Connected</span>
                  <button onClick={() => disconnect("NOTION")} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Disconnect</button>
                </div>
              ) : (
                <button
                  onClick={connectNotion}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Connect
                </button>
              )}
            </div>

            {hasNotion && notionDbs.length > 0 && (
              <div className="border-t border-zinc-800/60 pt-4">
                <p className="text-zinc-400 text-xs mb-2">Select the database to add reminders to:</p>
                <div className="flex gap-2">
                  <select
                    value={selectedDb}
                    onChange={(e) => setSelectedDb(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-600"
                  >
                    <option value="">Choose a database…</option>
                    {notionDbs.map((db) => (
                      <option key={db.id} value={db.id}>{db.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={saveNotionDb}
                    disabled={savingDb || !selectedDb}
                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                  >
                    {savingDb ? "Saving…" : "Save"}
                  </button>
                </div>
                {notionConn?.notionDbId && (
                  <p className="text-green-400 text-xs mt-1.5">✓ Database selected</p>
                )}
              </div>
            )}

            {hasNotion && notionDbs.length === 0 && (
              <p className="text-zinc-500 text-xs mt-2">No databases found. Make sure you share at least one database with the Credify integration in Notion.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
