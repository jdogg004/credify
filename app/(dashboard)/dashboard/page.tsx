import { redirect } from "next/navigation";
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/onboarding");

  const { workspace } = ctx;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [jobsThisMonth, totalJobs, recentJobs] = await Promise.all([
    prisma.metadataJob.count({ where: { workspaceId: workspace.id, createdAt: { gte: monthStart } } }),
    prisma.metadataJob.count({ where: { workspaceId: workspace.id } }),
    prisma.metadataJob.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Welcome back to {workspace.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Credits remaining", value: workspace.credits },
          { label: "Jobs this month", value: jobsThisMonth },
          { label: "Total jobs", value: totalJobs },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-5 border border-zinc-800/60" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-wide">{stat.label}</p>
            <p className="font-display font-bold text-white text-3xl mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Upgrade CTA */}
      {workspace.plan === "FREE" && workspace.credits < 10 && (
        <div className="rounded-xl p-5 border border-brand-600/30 bg-brand-600/5 mb-8">
          <p className="text-white font-semibold text-sm">Running low on credits</p>
          <p className="text-zinc-400 text-sm mt-1">You have {workspace.credits} credits left. Upgrade to Pro for 250/month.</p>
          <Link href="/settings/billing" className="inline-flex items-center gap-1.5 text-brand-400 text-sm mt-3 hover:text-brand-300 transition-colors">
            Upgrade now →
          </Link>
        </div>
      )}

      {/* Recent jobs */}
      <div>
        <h2 className="font-display font-semibold text-white text-lg mb-4">Recent jobs</h2>
        {recentJobs.length === 0 ? (
          <div className="rounded-xl p-6 border border-zinc-800/60 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-zinc-500 text-sm">No jobs yet.</p>
            <Link href="/app" className="inline-flex items-center gap-1.5 text-brand-400 text-sm mt-3 hover:text-brand-300 transition-colors">
              Fix your first credits →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl px-5 py-3 border border-zinc-800/60 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <span className="text-zinc-300 text-sm truncate max-w-xs">{job.rawInput.slice(0, 60)}…</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded ${
                      job.status === "COMPLETED"
                        ? "text-green-400 bg-green-600/15"
                        : job.status === "FAILED"
                        ? "text-red-400 bg-red-600/15"
                        : "text-yellow-400 bg-yellow-600/15"
                    }`}
                  >
                    {job.status}
                  </span>
                  <span className="text-zinc-600 text-xs">{new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
