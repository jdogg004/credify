import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { databaseId } = await req.json();
  if (!databaseId) return NextResponse.json({ error: "databaseId required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  await prisma.calendarConnection.updateMany({
    where: { workspaceId: membership.workspaceId, userId: user.id, provider: "NOTION" },
    data: { notionDbId: databaseId },
  });

  return NextResponse.json({ ok: true });
}
