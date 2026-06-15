"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Plan, MemberRole } from "@prisma/client";

interface Props {
  workspaceName: string;
  plan: Plan;
  credits: number;
  role: MemberRole;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "⬡" },
  { href: "/app", label: "Fix Credits", icon: "✦" },
  { href: "/reminders", label: "Reminders", icon: "◷" },
  { href: "/settings/team", label: "Team", icon: "◈" },
  { href: "/settings/billing", label: "Billing", icon: "◉" },
  { href: "/settings/integrations", label: "Integrations", icon: "⬡" },
];

const planColors: Record<Plan, string> = {
  FREE: "text-zinc-400 bg-zinc-800",
  PRO: "text-brand-400 bg-brand-600/20",
  BUSINESS: "text-amber-400 bg-amber-600/20",
};

export default function Sidebar({ workspaceName, plan, credits, role }: Props) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800/60 flex flex-col h-full" style={{ background: "#0d0d10" }}>
      {/* Workspace */}
      <div className="px-5 pt-6 pb-4 border-b border-zinc-800/60">
        <span className="font-display font-bold text-white text-sm block truncate">{workspaceName}</span>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${planColors[plan]}`}>{plan}</span>
          <span className="text-zinc-500 text-xs">{credits} credits</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navLinks.map((link) => {
          const active = pathname === link.href || (link.href !== "/dashboard" && link.href !== "/app" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-brand-600/15 text-brand-300"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-zinc-800/60 pt-3">
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors w-full text-left"
        >
          <span>⎋</span> Sign out
        </button>
      </div>
    </aside>
  );
}
