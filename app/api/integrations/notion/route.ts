import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  await prisma.calendarConnection.deleteMany({
    where: { workspaceId: membership.workspaceId, userId: user.id, provider: "NOTION" },
  });

  return NextResponse.json({ ok: true });
}
