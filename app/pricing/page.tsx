"use client";
import { useState } from "react";
import Link from "next/link";

const plans = [
  {
    key: "FREE",
    name: "Free",
    desc: "For individuals getting started.",
    monthly: 0,
    annual: 0,
    credits: 25,
    seats: 10,
    features: ["25 credits/month", "10 team seats", "Credit cleanup", "Issue detection"],
    cta: "Get started free",
    href: "/sign-up",
    highlight: false,
  },
  {
    key: "PRO",
    name: "Pro",
    desc: "For active A&R teams.",
    monthly: 19,
    annual: 190,
    credits: 250,
    seats: 10,
    features: ["250 credits/month", "10 team seats", "Credit cleanup", "Issue detection", "Priority support"],
    cta: "Start Pro",
    href: "/sign-up",
    highlight: true,
  },
  {
    key: "BUSINESS",
    name: "Business",
    desc: "For labels and distributors.",
    monthly: 79,
    annual: 790,
    credits: 1000,
    seats: 20,
    features: ["1000 credits/month", "20 team seats", "Credit cleanup", "Issue detection", "Priority support", "Custom onboarding"],
    cta: "Start Business",
    href: "/sign-up",
    highlight: false,
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#09090b" }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%)",
        }}
      />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <Link href="/" className="font-display font-bold text-xl text-white tracking-tight">Credify</Link>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition-colors">Sign in</Link>
          <Link href="/sign-up" className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors">Get started</Link>
        </div>
      </nav>

      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <span className="font-mono text-xs text-brand-400 tracking-widest uppercase">Pricing</span>
          <h1 className="font-display font-bold text-white text-5xl mt-3 mb-4">Simple, transparent pricing</h1>
          <p className="text-zinc-400 text-lg">Start free. Upgrade when your team needs more.</p>

          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mt-8">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${!annual ? "bg-brand-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${annual ? "bg-brand-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Annual <span className="text-xs text-brand-400 ml-1">save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-2xl p-6 border flex flex-col ${plan.highlight ? "border-brand-600/50 bg-brand-600/5" : "border-zinc-800/60"}`}
              style={!plan.highlight ? { background: "rgba(255,255,255,0.02)" } : {}}
            >
              {plan.highlight && (
                <div className="mb-4">
                  <span className="font-mono text-xs text-brand-400 tracking-widest uppercase bg-brand-600/20 px-2 py-1 rounded">Most popular</span>
                </div>
              )}
              <h2 className="font-display font-bold text-white text-xl">{plan.name}</h2>
              <p className="text-zinc-500 text-sm mt-1 mb-4">{plan.desc}</p>
              <div className="mb-6">
                <span className="font-display font-bold text-white text-4xl">
                  ${annual ? (plan.annual / 12).toFixed(0) : plan.monthly}
                </span>
                <span className="text-zinc-500 text-sm">/mo</span>
                {annual && plan.annual > 0 && (
                  <p className="text-zinc-500 text-xs mt-1">Billed ${plan.annual}/year</p>
                )}
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-brand-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.highlight ? "bg-brand-600 hover:bg-brand-500 text-white" : "border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white"}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
