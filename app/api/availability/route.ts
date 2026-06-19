import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkAvailability } from "@/lib/availability";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, artist, isrc } = await req.json();
  if (!title?.trim() || !artist?.trim()) {
    return NextResponse.json({ error: "Title and artist are required" }, { status: 400 });
  }

  try {
    const result = await checkAvailability({ title: title.trim(), artist: artist.trim(), isrc: isrc?.trim() || undefined });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Availability check failed" }, { status: 500 });
  }
}
