import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

export const PLANS = {
  setup: {
    name: "Setup",
    price: 14900, // $149 in cents
    interval: "one_time" as const,
    description: "Your CPD system, built and delivered in 24 hours.",
  },
  managed_monthly: {
    name: "Managed",
    price: 3900, // $39/month in cents
    interval: "month" as const,
    description: "Ongoing compliance - we keep you audit-ready year-round.",
  },
  managed_yearly: {
    name: "Managed (Annual)",
    price: 39900, // $399/year in cents
    interval: "year" as const,
    description: "Ongoing compliance - annual billing (save 15%).",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
