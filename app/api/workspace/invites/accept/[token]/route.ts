import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.email !== invite.email) return NextResponse.json({ error: "Email mismatch" }, { status: 403 });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
    update: { role: invite.role },
    create: { workspaceId: invite.workspaceId, userId: user.id, role: invite.role },
  });

  await prisma.workspaceInvite.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}
