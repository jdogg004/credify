import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/config/plans";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json([], { status: 200 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  if (!membership) return NextResponse.json([], { status: 200 });

  const invites = await prisma.workspaceInvite.findMany({ where: { workspaceId: membership.workspaceId } });
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { include: { members: true } } },
  });
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workspace = membership.workspace;
  const plan = PLANS[workspace.plan];
  if (workspace.members.length >= plan.maxSeats) {
    return NextResponse.json({ error: "Seat limit reached" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await prisma.workspaceInvite.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email } },
    update: { role: role ?? "EDITOR", expiresAt },
    create: { workspaceId: workspace.id, email, role: role ?? "EDITOR", expiresAt },
  });

  return NextResponse.json(invite);
}
