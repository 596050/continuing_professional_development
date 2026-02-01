import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, withRateLimit } from "@/lib/api-utils";
import { getStripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import type { PlanKey } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "checkout", { windowMs: 60_000, max: 5 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { plan } = (await req.json()) as { plan: PlanKey };

    if (!plan || !PLANS[plan]) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    const selectedPlan = PLANS[plan];
    const appUrl = process.env.BASE_URL || "http://localhost:3000";

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const isSubscription = selectedPlan.interval !== "one_time";

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: isSubscription ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `AuditReadyCPD - ${selectedPlan.name}`,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.price,
            ...(isSubscription
              ? { recurring: { interval: selectedPlan.interval as "month" | "year" } }
              : {}),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        userId: session.user.id,
        plan,
      },
    });

    // Record the payment attempt
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        stripeSessionId: checkoutSession.id,
        amount: selectedPlan.price,
        plan,
        interval: selectedPlan.interval,
        status: "pending",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    return serverError(err);
  }
}
