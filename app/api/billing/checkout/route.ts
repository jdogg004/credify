import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { PLANS, PlanKey } from "@/lib/config/plans";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, interval } = await req.json();

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const workspace = membership.workspace;
  const planConfig = PLANS[plan as PlanKey];
  if (!planConfig) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const priceId = interval === "annual" ? planConfig.stripePriceIdAnnual : planConfig.stripePriceIdMonthly;
  if (!priceId) return NextResponse.json({ error: "No price configured" }, { status: 400 });

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let customerId = workspace.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { workspaceId: workspace.id } });
    customerId = customer.id;
    await prisma.workspace.update({ where: { id: workspace.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { workspaceId: workspace.id, plan, interval },
  });

  return NextResponse.json({ url: session.url });
}
