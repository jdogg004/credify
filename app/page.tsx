import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "#09090b" }}>
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <span className="font-display font-bold text-xl text-white tracking-tight">Credify</span>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors nav-cta px-3 py-1.5 rounded-lg">
            Pricing
          </Link>
          <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition-colors nav-cta px-3 py-1.5 rounded-lg">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-600/10 border border-brand-600/20 rounded-full px-4 py-1.5 mb-8">
          <span className="font-mono text-xs text-brand-400 tracking-widest uppercase">AI-Powered A&amp;R Admin</span>
        </div>
        <h1
          className="font-display font-bold text-white leading-[1.05] tracking-tight mb-6"
          style={{ fontSize: "clamp(48px, 6.5vw, 88px)" }}
        >
          Clean credits.
          <br />
          <span style={{ color: "#a78bfa" }}>Ship releases.</span>
        </h1>
        <p className="text-zinc-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste messy A&amp;R credits and let Claude fix them in seconds. Catch errors before distribution. Built for labels, distributors, and A&amp;R admins.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
          >
            Start for free <span className="arr">→</span>
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-7 py-3.5 rounded-xl transition-colors text-sm"
          >
            View pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
        <div className="text-center mb-16">
          <span className="font-mono text-xs text-brand-400 tracking-widest uppercase">How it works</span>
          <h2 className="font-display font-bold text-white text-4xl mt-3">Fix credits in three steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Paste your credits", desc: "Drop in raw, messy credit text from any source — spreadsheets, emails, DAW exports." },
            { step: "02", title: "Claude analyzes it", desc: "Our AI identifies misspellings, role mismatches, missing info, and inconsistencies instantly." },
            { step: "03", title: "Ship clean metadata", desc: "Get corrected credits with confidence notes, issues flagged, and suggestions to review." },
          ].map((f) => (
            <div
              key={f.step}
              className="rounded-2xl p-6 border border-zinc-800/60"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <span className="font-mono text-xs text-brand-400 tracking-widest">{f.step}</span>
              <h3 className="font-display font-semibold text-white text-lg mt-3 mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/60 px-8 py-8 max-w-7xl mx-auto flex items-center justify-between">
        <span className="font-display font-bold text-white">Credify</span>
        <p className="text-zinc-600 text-xs">© 2025 Credify. All rights reserved.</p>
      </footer>
    </div>
  );
}
