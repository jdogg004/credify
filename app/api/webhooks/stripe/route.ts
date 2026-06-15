import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { PLANS, PlanKey } from "@/lib/config/plans";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { workspaceId, plan } = session.metadata ?? {};
      if (!workspaceId || !plan) break;

      const planConfig = PLANS[plan as PlanKey];
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          plan: plan as PlanKey,
          credits: planConfig.credits,
          stripeSubId: typeof session.subscription === "string" ? session.subscription : null,
          subStatus: "active",
        },
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (!subId) break;

      const workspace = await prisma.workspace.findFirst({ where: { stripeSubId: subId } });
      if (!workspace) break;

      const planConfig = PLANS[workspace.plan];
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { credits: planConfig.credits, subStatus: "active" },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.workspace.updateMany({
        where: { stripeSubId: sub.id },
        data: { plan: "FREE", credits: PLANS.FREE.credits, stripeSubId: null, subStatus: null },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (!subId) break;

      await prisma.workspace.updateMany({
        where: { stripeSubId: subId },
        data: { subStatus: "past_due" },
      });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
