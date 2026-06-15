"use client";
import { useState } from "react";
import Link from "next/link";

interface ClaudeResult {
  cleanedText: string;
  issues: string[];
  suggestions: string[];
  confidenceNote: string;
}

export default function FixCreditsPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ClaudeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outOfCredits, setOutOfCredits] = useState(false);

  async function handleFix() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setOutOfCredits(false);

    const res = await fetch("/api/fix-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput: input }),
    });

    if (res.status === 402) {
      setOutOfCredits(true);
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl">Fix Credits</h1>
        <p className="text-zinc-400 text-sm mt-1">Paste your raw credit text below and Claude will clean it up.</p>
      </div>

      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste raw A&R credits here…"
          rows={10}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-600 transition-colors resize-none font-mono text-sm"
        />

        {outOfCredits && (
          <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/5">
            <p className="text-red-400 font-semibold text-sm">Out of credits</p>
            <p className="text-zinc-400 text-sm mt-1">You have no credits remaining this month.</p>
            <Link href="/pricing" className="inline-flex items-center gap-1 text-brand-400 text-sm mt-2 hover:text-brand-300">
              Upgrade your plan →
            </Link>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleFix}
          disabled={loading || !input.trim()}
          className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          {loading ? "Analyzing…" : "Fix Credits"}
        </button>
      </div>

      {result && (
        <div className="mt-8 space-y-4">
          <div className="rounded-xl p-5 border border-zinc-800/60" style={{ background: "rgba(255,255,255,0.02)" }}>
            <h2 className="font-display font-semibold text-white text-sm mb-3">Cleaned Credits</h2>
            <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">{result.cleanedText}</pre>
          </div>

          {result.issues.length > 0 && (
            <div className="rounded-xl p-5 border border-yellow-600/30 bg-yellow-600/5">
              <h2 className="font-display font-semibold text-yellow-400 text-sm mb-2">Issues detected</h2>
              <ul className="space-y-1">
                {result.issues.map((issue, i) => (
                  <li key={i} className="text-zinc-300 text-sm">• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div className="rounded-xl p-5 border border-blue-600/30 bg-blue-600/5">
              <h2 className="font-display font-semibold text-blue-400 text-sm mb-2">Suggestions</h2>
              <ul className="space-y-1">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-zinc-300 text-sm">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.confidenceNote && (
            <p className="text-zinc-500 text-xs italic">{result.confidenceNote}</p>
          )}
        </div>
      )}
    </div>
  );
}
