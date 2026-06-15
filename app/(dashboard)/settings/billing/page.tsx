"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface WorkspaceInfo {
  plan: string;
  credits: number;
  subStatus: string | null;
  referralCode: string;
}

export default function BillingPage() {
  const [ws, setWs] = useState<WorkspaceInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/workspace").then((r) => r.json()).then((d) => setWs({
      plan: d.plan,
      credits: d.credits,
      subStatus: d.subStatus,
      referralCode: d.referralCode,
    }));
  }, []);

  async function openPortal() {
    setLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const d = await res.json();
    if (d.url) window.location.href = d.url;
    setLoading(false);
  }

  function copyCode() {
    if (!ws) return;
    navigator.clipboard.writeText(ws.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ws) return <div className="p-8 text-zinc-500 text-sm">Loading…</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl">Billing</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your subscription and credits.</p>
      </div>

      {/* Plan card */}
      <div className="rounded-xl p-5 border border-zinc-800/60 mb-4" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-mono text-xs text-brand-400 tracking-widest uppercase">Current plan</span>
            <h2 className="font-display font-bold text-white text-2xl mt-1">{ws.plan}</h2>
          </div>
          {ws.subStatus && (
            <span className={`font-mono text-xs px-2 py-1 rounded ${ws.subStatus === "past_due" ? "bg-red-600/20 text-red-400" : "bg-green-600/20 text-green-400"}`}>
              {ws.subStatus}
            </span>
          )}
        </div>
        <p className="text-zinc-400 text-sm">{ws.credits} credits remaining this month</p>

        <div className="mt-4 flex gap-2">
          {ws.plan !== "FREE" ? (
            <button
              onClick={openPortal}
              disabled={loading}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              {loading ? "Loading…" : "Manage billing"}
            </button>
          ) : (
            <Link href="/pricing" className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              Upgrade
            </Link>
          )}
        </div>
      </div>

      {/* Referral */}
      <div className="rounded-xl p-5 border border-zinc-800/60" style={{ background: "rgba(255,255,255,0.02)" }}>
        <h2 className="font-display font-semibold text-white text-sm mb-2">Referral code</h2>
        <p className="text-zinc-400 text-xs mb-3">Share your code. Both you and the new user get +50 credits when they use it.</p>
        <div className="flex items-center gap-2">
          <code className="font-mono text-brand-400 bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl text-sm flex-1">{ws.referralCode}</code>
          <button
            onClick={copyCode}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-2 rounded-xl transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
