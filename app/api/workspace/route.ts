import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { customAlphabet } from "nanoid";
import { PLANS } from "@/lib/config/plans";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + nanoid(4).toLowerCase();
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, referralCode } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (existing) return NextResponse.json({ error: "Already in a workspace" }, { status: 400 });

  let referrer: Awaited<ReturnType<typeof prisma.workspace.findUnique>> | null = null;
  let bonusCredits = 0;
  if (referralCode?.trim()) {
    referrer = await prisma.workspace.findUnique({ where: { referralCode: referralCode.trim() } });
    if (referrer) bonusCredits = 50;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      slug: toSlug(name.trim()),
      referralCode: nanoid(),
      referredBy: referrer?.id ?? null,
      credits: PLANS.FREE.credits + bonusCredits,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  if (referrer) {
    await prisma.workspace.update({
      where: { id: referrer.id },
      data: { credits: { increment: 50 } },
    });
  }

  return NextResponse.json(workspace);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: {
        include: {
          members: { include: { user: true } },
          invites: true,
        },
      },
    },
  });

  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(membership.workspace);
}
