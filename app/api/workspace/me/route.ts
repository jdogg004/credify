import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { role: true },
  });

  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ role: membership.role });
}
