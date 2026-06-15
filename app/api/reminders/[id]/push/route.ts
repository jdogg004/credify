import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { createGoogleCalendarEvent, refreshGoogleToken } from "@/lib/google-calendar";
import { createNotionPage } from "@/lib/notion";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { provider } = await req.json();

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });

  const connection = await prisma.calendarConnection.findUnique({
    where: {
      workspaceId_userId_provider: {
        workspaceId: membership.workspaceId,
        userId: user.id,
        provider,
      },
    },
  });

  if (!connection) return NextResponse.json({ error: "Integration not connected" }, { status: 400 });

  const event = {
    title: reminder.title,
    notes: reminder.notes ?? undefined,
    dueAt: reminder.dueAt ?? new Date(),
  };

  if (provider === "GOOGLE") {
    let accessToken = connection.accessToken;

    if (connection.tokenExpiry && connection.tokenExpiry < new Date() && connection.refreshToken) {
      const refreshed = await refreshGoogleToken(connection.refreshToken);
      accessToken = refreshed.access_token;
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: refreshed.access_token,
          tokenExpiry: refreshed.expiry_date ? new Date(refreshed.expiry_date) : null,
        },
      });
    }

    const url = await createGoogleCalendarEvent(accessToken, event);
    return NextResponse.json({ url });
  }

  if (provider === "NOTION") {
    if (!connection.notionDbId) {
      return NextResponse.json({ error: "No Notion database selected — configure in Integrations settings" }, { status: 400 });
    }
    const url = await createNotionPage(connection.accessToken, connection.notionDbId, event);
    return NextResponse.json({ url });
  }

  return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
}
