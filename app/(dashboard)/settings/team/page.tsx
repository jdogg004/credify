"use client";
import { useEffect, useState } from "react";

interface Member { id: string; role: string; user: { email: string; firstName: string | null; lastName: string | null; avatarUrl: string | null } }
interface Invite { id: string; email: string; role: string; token: string }
interface WorkspaceData { members: Member[]; invites: Invite[] }

export default function TeamPage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("EDITOR");
  const [inviteToken, setInviteToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [wsRes, meRes] = await Promise.all([fetch("/api/workspace"), fetch("/api/workspace/me")]);
    if (wsRes.ok) setData(await wsRes.json());
    if (meRes.ok) { const m = await meRes.json(); setMyRole(m.role); }
  }

  useEffect(() => { load(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/workspace/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    if (res.ok) {
      const d = await res.json();
      setInviteToken(d.token);
      setInviteEmail("");
      await load();
    }
    setLoading(false);
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/workspace/invites/${id}`, { method: "DELETE" });
    await load();
  }

  async function removeMember(id: string) {
    await fetch(`/api/workspace/members/${id}`, { method: "DELETE" });
    await load();
  }

  if (!data) return <div className="p-8 text-zinc-500 text-sm">Loading…</div>;

  const isOwner = myRole === "OWNER";
  const inviteLink = inviteToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteToken}` : "";

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl">Team</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage workspace members and invites.</p>
      </div>

      {/* Members */}
      <div className="rounded-xl border border-zinc-800/60 mb-6 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="px-5 py-3 border-b border-zinc-800/60">
          <h2 className="font-display font-semibold text-white text-sm">Members</h2>
        </div>
        {data.members.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/30 last:border-0">
            <div>
              <p className="text-white text-sm">{m.user.firstName ?? ""} {m.user.lastName ?? ""} <span className="text-zinc-500">({m.user.email})</span></p>
              <span className="font-mono text-xs text-zinc-500">{m.role}</span>
            </div>
            {isOwner && m.role !== "OWNER" && (
              <button onClick={() => removeMember(m.id)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">Remove</button>
            )}
          </div>
        ))}
      </div>

      {/* Invites */}
      {data.invites.length > 0 && (
        <div className="rounded-xl border border-zinc-800/60 mb-6 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="px-5 py-3 border-b border-zinc-800/60">
            <h2 className="font-display font-semibold text-white text-sm">Pending invites</h2>
          </div>
          {data.invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/30 last:border-0">
              <div>
                <p className="text-zinc-300 text-sm">{inv.email}</p>
                <span className="font-mono text-xs text-zinc-500">{inv.role}</span>
              </div>
              {isOwner && (
                <button onClick={() => revokeInvite(inv.id)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">Revoke</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      {isOwner && (
        <form onSubmit={handleInvite} className="rounded-xl p-5 border border-zinc-800/60 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
          <h2 className="font-display font-semibold text-white text-sm">Invite a member</h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-600 transition-colors text-sm"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-600 text-sm"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            {loading ? "Sending…" : "Send invite"}
          </button>
          {inviteLink && (
            <div className="mt-2 p-3 bg-zinc-900 rounded-xl border border-zinc-700">
              <p className="text-zinc-400 text-xs mb-1">Shareable invite link:</p>
              <p className="font-mono text-xs text-brand-400 break-all">{inviteLink}</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
