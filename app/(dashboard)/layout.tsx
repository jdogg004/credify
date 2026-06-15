import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#09090b" }}>
      <Sidebar
        workspaceName={ctx.workspace.name}
        plan={ctx.workspace.plan}
        credits={ctx.workspace.credits}
        role={ctx.role}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
