import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { exchangeGoogleCode } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/settings/integrations?error=no_code", req.url));

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.redirect(new URL("/settings/integrations?error=not_found", req.url));

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (!membership) return NextResponse.redirect(new URL("/settings/integrations?error=no_workspace", req.url));

  try {
    const tokens = await exchangeGoogleCode(code);
    await prisma.calendarConnection.upsert({
      where: {
        workspaceId_userId_provider: {
          workspaceId: membership.workspaceId,
          userId: user.id,
          provider: "GOOGLE",
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      create: {
        workspaceId: membership.workspaceId,
        userId: user.id,
        provider: "GOOGLE",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
    return NextResponse.redirect(new URL("/settings/integrations?connected=google", req.url));
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/settings/integrations?error=google_failed", req.url));
  }
}
