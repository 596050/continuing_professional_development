"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const tiers = [
  {
    name: "DIY",
    price: "Free",
    period: "",
    planKey: null,
    description: "If you enjoy DIY admin, here you go.",
    features: [
      "CPD spreadsheet template",
      "Rules library links",
      "Requirement summaries",
    ],
    notIncluded: [
      "No dashboard",
      "No reminders",
      "No audit pack",
      "No support",
    ],
    cta: "Download template",
    ctaStyle: "border border-border text-text-muted hover:bg-surface-alt",
    highlight: false,
  },
  {
    name: "Setup",
    price: "$149",
    period: "one-time",
    planKey: "setup" as const,
    description: "Your CPD system, built and delivered in 24 hours.",
    features: [
      "Requirements mapped",
      "CPD plan built",
      "Dashboard created",
      "Reminder system set",
      "Audit binder folder created",
      "Compliance brief (PDF)",
      "7-day email support",
    ],
    notIncluded: [],
    cta: "Get set up",
    ctaStyle: "bg-accent text-white hover:bg-accent-dark shadow-lg shadow-accent/25",
    highlight: true,
  },
  {
    name: "Managed",
    price: "$39",
    period: "/month",
    planKey: "managed_monthly" as const,
    description: "Ongoing compliance - we keep you audit-ready year-round.",
    features: [
      "Everything in Setup",
      "Monthly check-ins",
      "Evidence review",
      "Quarterly compliance export",
      "Priority support",
      "Deadline rescue sprint",
    ],
    notIncluded: [],
    cta: "Start managed plan",
    ctaStyle: "bg-primary text-white hover:bg-primary-light",
    highlight: false,
  },
  {
    name: "Firm",
    price: "Custom",
    period: "per seat",
    planKey: null,
    description: "For RIAs, practices, and advice networks.",
    features: [
      "Everything in Managed",
      "Firm dashboard",
      "Per-adviser status views",
      "Audit report packs",
      "Policy templates",
      "Consolidated billing",
      "Onboarding concierge",
    ],
    notIncluded: [],
    cta: "Talk to us",
    ctaStyle: "border border-border text-text-muted hover:bg-surface-alt",
    highlight: false,
  },
];

export function Pricing() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planKey: string) => {
    if (!session) {
      router.push("/auth/signup");
      return;
    }

    setLoadingPlan(planKey);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="bg-surface-alt px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text md:text-4xl">
            Simple pricing. No surprises.
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            Start with a one-time setup. Upgrade to managed when you want hands-off compliance.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl bg-white p-8 transition-shadow ${
                tier.highlight
                  ? "ring-2 ring-accent shadow-xl hover:shadow-2xl"
                  : "border border-border shadow-sm hover:shadow-lg"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-semibold text-text">{tier.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-text">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-text-light">{tier.period}</span>
                )}
              </div>
              <p className="mt-3 text-sm text-text-muted">{tier.description}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-text-muted">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
                {tier.notIncluded.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-text-light">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              {tier.planKey ? (
                <button
                  onClick={() => handleCheckout(tier.planKey!)}
                  disabled={loadingPlan === tier.planKey}
                  className={`mt-8 block w-full cursor-pointer rounded-lg px-6 py-3 text-center text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${tier.ctaStyle}`}
                >
                  {loadingPlan === tier.planKey ? "Loading..." : tier.cta}
                </button>
              ) : (
                <a
                  href={tier.name === "Firm" ? "mailto:hello@auditreadycpd.com" : "#"}
                  className={`mt-8 block cursor-pointer rounded-lg px-6 py-3 text-center text-sm font-semibold transition active:scale-[0.97] ${tier.ctaStyle}`}
                >
                  {tier.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
