import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getNotionDatabases } from "@/lib/notion";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json([], { status: 200 });

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (!membership) return NextResponse.json([], { status: 200 });

  const connection = await prisma.calendarConnection.findUnique({
    where: {
      workspaceId_userId_provider: {
        workspaceId: membership.workspaceId,
        userId: user.id,
        provider: "NOTION",
      },
    },
  });

  if (!connection) return NextResponse.json([], { status: 200 });

  const dbs = await getNotionDatabases(connection.accessToken);
  return NextResponse.json(dbs);
}
