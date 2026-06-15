import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64");
  const url = getGoogleAuthUrl(state);
  return NextResponse.json({ url });
}
