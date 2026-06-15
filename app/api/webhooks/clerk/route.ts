import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";

interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const svixId = req.headers.get("svix-id") ?? "";
  const svixTs = req.headers.get("svix-timestamp") ?? "";
  const svixSig = req.headers.get("svix-signature") ?? "";

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let event: ClerkUserEvent;

  try {
    event = wh.verify(body, { "svix-id": svixId, "svix-timestamp": svixTs, "svix-signature": svixSig }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const primaryEmail = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
    await prisma.user.upsert({
      where: { clerkId: data.id },
      update: {
        email: primaryEmail?.email_address ?? "",
        firstName: data.first_name,
        lastName: data.last_name,
        avatarUrl: data.image_url,
      },
      create: {
        clerkId: data.id,
        email: primaryEmail?.email_address ?? "",
        firstName: data.first_name,
        lastName: data.last_name,
        avatarUrl: data.image_url,
      },
    });
  }

  if (type === "user.deleted") {
    await prisma.user.delete({ where: { clerkId: data.id } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
