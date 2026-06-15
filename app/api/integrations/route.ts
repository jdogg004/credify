import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json([], { status: 200 });

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (!membership) return NextResponse.json([], { status: 200 });

  const connections = await prisma.calendarConnection.findMany({
    where: { workspaceId: membership.workspaceId, userId: user.id },
    select: { provider: true, notionDbId: true },
  });

  return NextResponse.json(connections);
}
