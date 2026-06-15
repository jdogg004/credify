import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json([], { status: 200 });

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (!membership) return NextResponse.json([], { status: 200 });

  const reminders = await prisma.reminder.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reminders);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, notes, dueAt } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const reminder = await prisma.reminder.create({
    data: {
      workspaceId: membership.workspaceId,
      userId: user.id,
      title: title.trim(),
      notes: notes?.trim() || null,
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });

  return NextResponse.json(reminder);
}
