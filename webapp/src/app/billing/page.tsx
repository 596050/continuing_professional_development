"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Button, Spinner, AppNav, Card, Badge,
  Alert, DataList, DataRow,
} from "@/components/ui";

interface BillingData {
  plan: string;
  planActivatedAt: string | null;
  stripeCustomerId: string | null;
}

const planDetails: Record<string, { name: string; price: string; interval: string }> = {
  free: { name: "Free", price: "$0", interval: "" },
  setup: { name: "Setup", price: "$149", interval: "one-time" },
  managed: { name: "Managed", price: "$39/mo", interval: "monthly" },
  firm: { name: "Firm", price: "Custom", interval: "varies" },
};

export default function BillingPage() {
  const { data: session, status: authStatus } = useSession();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setBilling({
          plan: data.user?.plan ?? "free",
          planActivatedAt: data.user?.planActivatedAt ?? null,
          stripeCustomerId: null,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authStatus]);

  const handleUpgrade = async (plan: string) => {
    setUpgrading(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch {
      // Silently fail
    } finally {
      setUpgrading(null);
    }
  };

  if (authStatus === "loading" || loading) return <Spinner text="Loading billing..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="mt-2 text-gray-600">Please sign in to manage billing.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  const currentPlan = billing?.plan ?? "free";
  const details = planDetails[currentPlan] ?? planDetails.free;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your subscription and billing details.</p>

        {/* Current plan */}
        <Card className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Current plan</h2>
            <Badge variant="blue" shape="rounded">{details.name}</Badge>
          </div>
          <div className="mt-4">
            <DataList>
              <DataRow label="Plan" value={<span className="capitalize font-medium text-blue-600">{details.name}</span>} />
              <DataRow label="Price" value={details.price} />
              {details.interval && <DataRow label="Billing" value={details.interval} />}
              {billing?.planActivatedAt && (
                <DataRow
                  label="Active since"
                  value={new Date(billing.planActivatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                />
              )}
            </DataList>
          </div>
        </Card>

        {/* Plan options */}
        {currentPlan === "free" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Upgrade your plan</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {/* Setup */}
              <Card className="border-2 border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Setup</h3>
                <div className="mt-2 text-3xl font-bold text-gray-900">$149</div>
                <p className="mt-1 text-xs text-gray-500">One-time</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li>CPD system built in 24h</li>
                  <li>Credential rules configured</li>
                  <li>Evidence vault setup</li>
                </ul>
                <div className="mt-6">
                  <Button
                    fullWidth
                    onClick={() => handleUpgrade("setup")}
                    disabled={upgrading !== null}
                  >
                    {upgrading === "setup" ? "Redirecting..." : "Get started"}
                  </Button>
                </div>
              </Card>

              {/* Managed Monthly */}
              <Card className="border-2 border-blue-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Managed</h3>
                  <Badge variant="blue" shape="rounded">Popular</Badge>
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900">$39</div>
                <p className="mt-1 text-xs text-gray-500">per month</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li>Everything in Setup</li>
                  <li>Ongoing compliance tracking</li>
                  <li>Audit-ready year-round</li>
                  <li>Priority support</li>
                </ul>
                <div className="mt-6">
                  <Button
                    fullWidth
                    onClick={() => handleUpgrade("managed_monthly")}
                    disabled={upgrading !== null}
                  >
                    {upgrading === "managed_monthly" ? "Redirecting..." : "Subscribe monthly"}
                  </Button>
                </div>
              </Card>

              {/* Managed Annual */}
              <Card className="border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Managed (Annual)</h3>
                  <Badge variant="green" shape="rounded">Save 15%</Badge>
                </div>
                <div className="mt-2 text-3xl font-bold text-gray-900">$399</div>
                <p className="mt-1 text-xs text-gray-500">per year</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li>Everything in Managed</li>
                  <li>Annual billing discount</li>
                  <li>Priority onboarding</li>
                </ul>
                <div className="mt-6">
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => handleUpgrade("managed_yearly")}
                    disabled={upgrading !== null}
                  >
                    {upgrading === "managed_yearly" ? "Redirecting..." : "Subscribe annually"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {currentPlan !== "free" && (
          <Card className="mt-8">
            <h2 className="text-base font-semibold text-gray-900">Manage subscription</h2>
            <p className="mt-1 text-sm text-gray-500">
              Update payment method, change plan, or cancel your subscription through the Stripe customer portal.
            </p>
            <div className="mt-4">
              <Alert variant="info">
                Stripe customer portal integration is configured. Contact support to manage your subscription.
              </Alert>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
