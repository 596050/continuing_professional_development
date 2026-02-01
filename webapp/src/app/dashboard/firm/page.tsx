"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Button, Spinner, AppNav, Card, Badge,
  Alert, EmptyState, ProgressBar, StatsCard,
} from "@/components/ui";

interface FirmMember {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  role: string;
  hoursCompleted: number;
  hoursRequired: number;
  progressPercent: number;
  credentialName: string | null;
}

interface FirmData {
  firm: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    seatsLimit: number;
    active: boolean;
  };
  members: FirmMember[];
  stats: {
    totalMembers: number;
    averageProgress: number;
    compliantCount: number;
    atRiskCount: number;
  };
}

export default function FirmAdminPage() {
  const { data: session, status: authStatus } = useSession();
  const [data, setData] = useState<FirmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFirmData = useCallback(async () => {
    try {
      const res = await fetch("/api/firm/dashboard");
      if (res.status === 403) {
        setError("You do not have firm admin access.");
        return;
      }
      if (res.status === 404) {
        setError("No firm associated with your account.");
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load firm data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchFirmData();
  }, [authStatus, fetchFirmData]);

  if (authStatus === "loading" || loading) return <Spinner text="Loading firm dashboard..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Firm Dashboard</h1>
          <p className="mt-2 text-gray-600">Please sign in to access firm management.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Alert variant="error">{error}</Alert>
          <div className="mt-4">
            <a href="/dashboard" className="text-sm font-medium text-blue-600 underline">Back to dashboard</a>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { firm, members, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{firm.name}</h1>
            <p className="mt-1 text-sm text-gray-600">Firm compliance dashboard</p>
          </div>
          <Badge variant={firm.active ? "green" : "red"} shape="rounded">
            {firm.active ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Team members"
            value={stats.totalMembers}
            sub={`of ${firm.seatsLimit} seats`}
          />
          <StatsCard
            label="Average progress"
            value={`${stats.averageProgress}%`}
            valueColor="text-blue-600"
            sub="across all members"
          />
          <StatsCard
            label="Compliant"
            value={stats.compliantCount}
            valueColor="text-emerald-600"
            sub="members on track"
          />
          <StatsCard
            label="At risk"
            value={stats.atRiskCount}
            valueColor={stats.atRiskCount > 0 ? "text-red-600" : "text-gray-900"}
            sub="need attention"
          />
        </div>

        {/* Members table */}
        <Card className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Team members</h2>
            <Button size="sm" variant="secondary" disabled>
              Invite member
            </Button>
          </div>

          {members.length === 0 ? (
            <div className="mt-6">
              <EmptyState message="No team members yet. Invite your first member to get started." />
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs text-gray-500">
                  <tr>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Credential</th>
                    <th className="pb-2 pr-4">Progress</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900">{member.name || "Unnamed"}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {member.credentialName || "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="w-32">
                          <ProgressBar
                            completed={member.hoursCompleted}
                            required={member.hoursRequired}
                            size="sm"
                          />
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={member.progressPercent >= 100 ? "green" : member.progressPercent >= 50 ? "amber" : "red"}
                          shape="rounded"
                        >
                          {member.progressPercent >= 100 ? "Compliant" : member.progressPercent >= 50 ? "In progress" : "At risk"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Firm settings */}
        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Firm settings</h2>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Plan</dt>
              <dd className="mt-0.5 font-medium capitalize text-gray-900">{firm.plan}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Seats</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{stats.totalMembers} / {firm.seatsLimit}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Slug</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{firm.slug}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{firm.active ? "Active" : "Inactive"}</dd>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
