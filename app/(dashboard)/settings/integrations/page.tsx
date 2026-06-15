"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Connection {
  provider: "GOOGLE" | "NOTION";
  notionDbId: string | null;
}

interface NotionDB { id: string; title: string }

function IntegrationsInner() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [notionDbs, setNotionDbs] = useState<NotionDB[]>([]);
  const [selectedDb, setSelectedDb] = useState("");
  const [savingDb, setSavingDb] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const data: Connection[] = await res.json();
      setConnections(data);

      const notion = data.find((c) => c.provider === "NOTION");
      if (notion) {
        const dbRes = await fetch("/api/integrations/notion/databases");
        if (dbRes.ok) {
          const dbs: NotionDB[] = await dbRes.json();
          setNotionDbs(dbs);
          setSelectedDb(notion.notionDbId ?? "");
        }
      } else {
        setNotionDbs([]);
        setSelectedDb("");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "google") showToast("Google Calendar connected!");
    if (connected === "notion") showToast("Notion connected!");
    if (error) showToast(`Connection failed: ${error}`, "error");
  }, [load, searchParams]);

  async function connectGoogle() {
    const res = await fetch("/api/integrations/google/auth-url");
    const d = await res.json();
    if (d.url) window.location.href = d.url;
    else showToast("Failed to get Google auth URL", "error");
  }

  async function connectNotion() {
    const res = await fetch("/api/integrations/notion/auth-url");
    const d = await res.json();
    if (d.url) window.location.href = d.url;
    else showToast("Failed to get Notion auth URL", "error");
  }

  async function disconnect(provider: "GOOGLE" | "NOTION") {
    const res = await fetch(`/api/integrations/${provider.toLowerCase()}`, { method: "DELETE" });
    if (res.ok) {
      showToast(`${provider === "GOOGLE" ? "Google Calendar" : "Notion"} disconnected`);
      await load();
    } else {
      showToast("Failed to disconnect", "error");
    }
  }

  async function saveNotionDb() {
    setSavingDb(true);
    const res = await fetch("/api/integrations/notion/database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ databaseId: selectedDb }),
    });
    setSavingDb(false);
    if (res.ok) {
      showToast("Database saved!");
      await load();
    } else {
      showToast("Failed to save database", "error");
    }
  }

  const hasGoogle = connections.some((c) => c.provider === "GOOGLE");
  const hasNotion = connections.some((c) => c.provider === "NOTION");
  const notionConn = connections.find((c) => c.provider === "NOTION");

  return (
    <div className="p-8 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-600/90 text-white border border-green-500/40"
              : "bg-red-600/90 text-white border border-red-500/40"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl">Integrations</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Connect your calendar and note tools to push reminders. You can connect or disconnect at any time.
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-4">

          {/* Apple Calendar — always available, no auth */}
          <IntegrationCard
            icon="🍎"
            name="Apple Calendar"
            desc="Downloads a .ics file you can import into Apple Calendar, Outlook, or any calendar app — no account needed."
            statusBadge={<StatusBadge status="always-on" label="Always available" />}
            actions={null}
          />

          {/* Google Calendar */}
          <IntegrationCard
            icon="📅"
            name="Google Calendar"
            desc="Create events directly in your Google Calendar. We only request write access to calendar events."
            statusBadge={
              hasGoogle
                ? <StatusBadge status="connected" label="Connected" />
                : <StatusBadge status="disconnected" label="Not connected" />
            }
            actions={
              hasGoogle ? (
                <button
                  onClick={() => disconnect("GOOGLE")}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connectGoogle}
                  className="text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  Connect Google
                </button>
              )
            }
          />

          {/* Notion */}
          <div className="rounded-2xl border border-zinc-800/60 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">◻</span>
                <div>
                  <h2 className="font-display font-semibold text-white text-sm">Notion</h2>
                  <p className="text-zinc-500 text-xs mt-0.5">Create pages in a Notion database when you push a reminder.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasNotion
                  ? <StatusBadge status="connected" label="Connected" />
                  : <StatusBadge status="disconnected" label="Not connected" />
                }
                {hasNotion ? (
                  <button
                    onClick={() => disconnect("NOTION")}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1.5 rounded-lg transition-colors ml-2"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={connectNotion}
                    className="text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-lg transition-colors ml-2"
                  >
                    Connect Notion
                  </button>
                )}
              </div>
            </div>

            {/* Notion DB picker — only shown when connected */}
            {hasNotion && (
              <div className="border-t border-zinc-800/60 px-5 py-4 bg-zinc-900/40">
                <p className="text-zinc-400 text-xs font-medium mb-2">
                  Select the database where reminders will be added:
                </p>
                {notionDbs.length === 0 ? (
                  <p className="text-zinc-500 text-xs">
                    No databases found. In Notion, open a database and share it with the Credify integration, then refresh this page.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={selectedDb}
                      onChange={(e) => setSelectedDb(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-600 transition-colors"
                    >
                      <option value="">Choose a database…</option>
                      {notionDbs.map((db) => (
                        <option key={db.id} value={db.id}>{db.title}</option>
                      ))}
                    </select>
                    <button
                      onClick={saveNotionDb}
                      disabled={savingDb || !selectedDb}
                      className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
                    >
                      {savingDb ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
                {notionConn?.notionDbId && selectedDb && (
                  <p className="text-green-400 text-xs mt-2">✓ Database selected — reminders will be added here</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl border border-zinc-800/40" style={{ background: "rgba(255,255,255,0.01)" }}>
        <p className="text-zinc-500 text-xs">
          Disconnecting removes your stored tokens from Credify. Your calendar data is not affected.
          You can reconnect at any time.
        </p>
      </div>
    </div>
  );
}

function IntegrationCard({
  icon, name, desc, statusBadge, actions,
}: {
  icon: string;
  name: string;
  desc: string;
  statusBadge: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5 border border-zinc-800/60 flex items-center justify-between gap-4" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-white text-sm">{name}</h2>
          <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {statusBadge}
        {actions}
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: "connected" | "disconnected" | "always-on"; label: string }) {
  const styles = {
    connected: "text-green-400 bg-green-600/15 border-green-600/20",
    disconnected: "text-zinc-500 bg-zinc-800/60 border-zinc-700/40",
    "always-on": "text-brand-400 bg-brand-600/15 border-brand-600/20",
  };
  return (
    <span className={`font-mono text-xs px-2 py-1 rounded border ${styles[status]}`}>{label}</span>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Loading…</div>}>
      <IntegrationsInner />
    </Suspense>
  );
}
