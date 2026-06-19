"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface ChatMessage {
  from: "assistant" | "user";
  text: string;
}

interface Credit {
  role: string;
  name: string;
}

interface FixResult {
  cleanedText: string;
  issues: string[];
  suggestions: string[];
  confidenceNote: string;
}

interface PlatformResult {
  key: string;
  label: string;
  status: "found" | "not_found" | "check_store";
  openUrl?: string;
  searchUrl: string;
}

interface AvailabilityResult {
  platforms: PlatformResult[];
}

const ROLE_OPTIONS = [
  "Producer",
  "Songwriter",
  "Composer",
  "Mixing Engineer",
  "Mastering Engineer",
  "Immersive Audio Engineer",
  "Assistant Engineer",
  "Vocal Producer",
  "Additional Producer",
  "Other",
];

type Step =
  | "released"
  | "title"
  | "artist"
  | "isrc"
  | "upc"
  | "iswc"
  | "credits"
  | "rawInput"
  | "processing"
  | "done";

export default function FixCreditsPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "assistant", text: "Hi, I'm your Credify assistant. First question: Is this track already released?" },
  ]);
  const [step, setStep] = useState<Step>("released");
  const [textInput, setTextInput] = useState("");
  const [released, setReleased] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [isrc, setIsrc] = useState("");
  const [upc, setUpc] = useState("");
  const [iswc, setIswc] = useState("");
  const [credits, setCredits] = useState<Credit[]>([]);
  const [roleDraft, setRoleDraft] = useState(ROLE_OPTIONS[0]);
  const [nameDraft, setNameDraft] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [error, setError] = useState("");
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step]);

  function say(text: string) {
    setMessages((m) => [...m, { from: "assistant", text }]);
  }
  function reply(text: string) {
    setMessages((m) => [...m, { from: "user", text }]);
  }

  function handleReleased(isReleased: boolean) {
    setReleased(isReleased);
    reply(isReleased ? "Yes" : "No");
    say("What's the track title?");
    setStep("title");
  }

  function handleTitle() {
    if (!textInput.trim()) return;
    setTitle(textInput.trim());
    reply(textInput.trim());
    setTextInput("");
    say("Who is the artist?");
    setStep("artist");
  }

  function handleArtist() {
    if (!textInput.trim()) return;
    setArtist(textInput.trim());
    reply(textInput.trim());
    setTextInput("");
    say("Do you have the ISRC? (optional — type 'skip' if not)");
    setStep("isrc");
  }

  function handleOptional(field: "isrc" | "upc" | "iswc", next: Step, nextQuestion: string) {
    const val = textInput.trim();
    reply(val || "skip");
    setTextInput("");
    if (val && val.toLowerCase() !== "skip") {
      if (field === "isrc") setIsrc(val);
      if (field === "upc") setUpc(val);
      if (field === "iswc") setIswc(val);
    }
    say(nextQuestion);
    setStep(next);
  }

  function addCredit() {
    if (!nameDraft.trim()) return;
    setCredits((c) => [...c, { role: roleDraft, name: nameDraft.trim() }]);
    reply(`${roleDraft}: ${nameDraft.trim()}`);
    setNameDraft("");
  }

  function finishCredits() {
    say("Got it. Now paste the raw credit text you want me to check.");
    setStep("rawInput");
  }

  async function runCheck() {
    if (!rawInput.trim()) return;
    reply("(pasted raw credits)");
    setStep("processing");
    say("Checking…");
    setError("");
    setOutOfCredits(false);
    setFixResult(null);
    setAvailability(null);

    const fixRes = await fetch("/api/fix-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput, title, artist, isrc, upc, iswc, referenceCredits: credits }),
    });

    if (fixRes.status === 402) {
      setOutOfCredits(true);
      setStep("done");
      return;
    }
    if (!fixRes.ok) {
      const d = await fixRes.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong");
      setStep("done");
      return;
    }
    const fixData = await fixRes.json();
    setFixResult(fixData);

    if (released && title && artist) {
      const availRes = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, isrc }),
      });
      if (availRes.ok) {
        setAvailability(await availRes.json());
      }
    }

    say("Done — here's what I found.");
    setStep("done");
  }

  function startOver() {
    setMessages([{ from: "assistant", text: "Hi, I'm your Credify assistant. First question: Is this track already released?" }]);
    setStep("released");
    setReleased(null);
    setTitle("");
    setArtist("");
    setIsrc("");
    setUpc("");
    setIswc("");
    setCredits([]);
    setRawInput("");
    setFixResult(null);
    setAvailability(null);
    setError("");
    setOutOfCredits(false);
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-white text-3xl">Fix Credits</h1>
        <p className="text-zinc-400 text-sm mt-1">Answer a few questions and I'll check your credits for issues.</p>
      </div>

      <div className="space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-xl px-4 py-2.5 text-sm max-w-md whitespace-pre-wrap ${
                m.from === "user" ? "bg-brand-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-200"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {step === "released" && (
        <div className="flex gap-3">
          <button onClick={() => handleReleased(true)} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-5 py-2 rounded-xl transition-colors">
            Yes
          </button>
          <button onClick={() => handleReleased(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-5 py-2 rounded-xl transition-colors">
            No
          </button>
        </div>
      )}

      {(step === "title" || step === "artist" || step === "isrc" || step === "upc" || step === "iswc") && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (step === "title") handleTitle();
              else if (step === "artist") handleArtist();
              else if (step === "isrc") handleOptional("isrc", "upc", "Do you have the UPC? (optional — type 'skip' if not)");
              else if (step === "upc") handleOptional("upc", "iswc", "Do you have the ISWC? (optional — type 'skip' if not)");
              else if (step === "iswc") handleOptional("iswc", "credits", "Now let's add credits. Pick a role, enter the name, and add as many as you need. Type 'done' when finished.");
            }}
            placeholder="Type your answer…"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-600 transition-colors text-sm"
          />
          <button
            onClick={() => {
              if (step === "title") handleTitle();
              else if (step === "artist") handleArtist();
              else if (step === "isrc") handleOptional("isrc", "upc", "Do you have the UPC? (optional — type 'skip' if not)");
              else if (step === "upc") handleOptional("upc", "iswc", "Do you have the ISWC? (optional — type 'skip' if not)");
              else if (step === "iswc") handleOptional("iswc", "credits", "Now let's add credits. Pick a role, enter the name, and add as many as you need. Type 'done' when finished.");
            }}
            className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Send
          </button>
        </div>
      )}

      {step === "credits" && (
        <div className="space-y-3">
          {credits.length > 0 && (
            <ul className="space-y-1 mb-2">
              {credits.map((c, i) => (
                <li key={i} className="text-zinc-300 text-sm">• {c.role}: {c.name}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <select
              value={roleDraft}
              onChange={(e) => setRoleDraft(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-600"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCredit()}
              placeholder="Name"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-600 transition-colors text-sm"
            />
            <button onClick={addCredit} className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm">
              Add
            </button>
          </div>
          <button onClick={finishCredits} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
            Done adding credits
          </button>
        </div>
      )}

      {step === "rawInput" && (
        <div className="space-y-3">
          <textarea
            autoFocus
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Paste raw A&R credits here…"
            rows={8}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-brand-600 transition-colors resize-none font-mono text-sm"
          />
          <button
            onClick={runCheck}
            disabled={!rawInput.trim()}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Run Check
          </button>
        </div>
      )}

      {outOfCredits && (
        <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/5 mt-4">
          <p className="text-red-400 font-semibold text-sm">Out of credits</p>
          <p className="text-zinc-400 text-sm mt-1">You have no credits remaining this month.</p>
          <Link href="/pricing" className="inline-flex items-center gap-1 text-brand-400 text-sm mt-2 hover:text-brand-300">
            Upgrade your plan →
          </Link>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

      {fixResult && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl p-5 border border-zinc-800/60" style={{ background: "rgba(255,255,255,0.02)" }}>
            <h2 className="font-display font-semibold text-white text-sm mb-3">Cleaned Credits</h2>
            <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">{fixResult.cleanedText}</pre>
          </div>

          {fixResult.issues.length > 0 && (
            <div className="rounded-xl p-5 border border-yellow-600/30 bg-yellow-600/5">
              <h2 className="font-display font-semibold text-yellow-400 text-sm mb-2">Issues detected</h2>
              <ul className="space-y-1">
                {fixResult.issues.map((issue, i) => (
                  <li key={i} className="text-zinc-300 text-sm">• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {fixResult.suggestions.length > 0 && (
            <div className="rounded-xl p-5 border border-blue-600/30 bg-blue-600/5">
              <h2 className="font-display font-semibold text-blue-400 text-sm mb-2">Suggestions</h2>
              <ul className="space-y-1">
                {fixResult.suggestions.map((s, i) => (
                  <li key={i} className="text-zinc-300 text-sm">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {fixResult.confidenceNote && <p className="text-zinc-500 text-xs italic">{fixResult.confidenceNote}</p>}
        </div>
      )}

      {availability && (
        <div className="rounded-xl p-5 border border-zinc-800/60 mt-4" style={{ background: "rgba(255,255,255,0.02)" }}>
          <h2 className="font-display font-semibold text-white text-sm mb-3">DSP Availability</h2>
          <ul className="divide-y divide-zinc-800/60">
            {availability.platforms.map((p) => (
              <li key={p.key} className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-200">{p.label}</span>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      p.status === "found"
                        ? "text-green-400"
                        : p.status === "not_found"
                        ? "text-red-400"
                        : "text-yellow-400"
                    }
                  >
                    {p.status === "found" ? "FOUND" : p.status === "not_found" ? "NOT FOUND" : "CHECK STORE"}
                  </span>
                  <a
                    href={p.openUrl ?? p.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300"
                  >
                    {p.openUrl ? "Open →" : "Search →"}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === "done" && (
        <button onClick={startOver} className="mt-6 text-zinc-400 hover:text-white text-sm transition-colors">
          ← Start over
        </button>
      )}
    </div>
  );
}
