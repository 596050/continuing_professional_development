"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Button, Spinner, AppNav, Card, Badge,
  EmptyState, Select,
} from "@/components/ui";

interface CreditMapping {
  id: string;
  creditUnit: string;
  creditAmount: number;
  creditCategory: string;
  country: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  publishStatus: string;
  tags: string | null;
  jurisdictions: string | null;
  creditMappings: CreditMapping[];
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  live_webinar: "Live webinar",
  on_demand_video: "On-demand video",
  article: "Article",
  assessment_only: "Assessment",
  bundle: "Bundle",
};

const typeBadgeVariant: Record<string, "blue" | "green" | "purple" | "amber" | "gray"> = {
  live_webinar: "blue",
  on_demand_video: "green",
  article: "purple",
  assessment_only: "amber",
  bundle: "gray",
};

export default function ActivityCatalogPage() {
  const { data: session, status: authStatus } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await fetch(`/api/activities?${params}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, offset]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetchActivities();
  }, [authStatus, fetchActivities]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setOffset(0);
  };

  if (authStatus === "loading") return <Spinner text="Loading..." />;

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Activity Catalog</h1>
          <p className="mt-2 text-gray-600">Please sign in to browse activities.</p>
          <a href="/auth/signin" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Activity Catalog</h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse approved CPD activities and their credit mappings.
        </p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Search activities..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="w-48">
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}
            >
              <option value="">All types</option>
              {Object.entries(typeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="mt-8">
            <Spinner text="Loading activities..." />
          </div>
        ) : activities.length === 0 ? (
          <div className="mt-8">
            <EmptyState message="No activities found. Try adjusting your search or filters." />
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-gray-500">
              Showing {offset + 1}&ndash;{Math.min(offset + limit, total)} of {total} activities
            </p>

            <div className="mt-4 space-y-3">
              {activities.map((activity) => {
                const tags = activity.tags ? JSON.parse(activity.tags) : [];
                const totalCredits = activity.creditMappings.reduce(
                  (sum, m) => sum + m.creditAmount,
                  0
                );

                return (
                  <Card key={activity.id} className="hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {activity.title}
                          </h3>
                          <Badge
                            variant={typeBadgeVariant[activity.type] ?? "gray"}
                            shape="rounded"
                          >
                            {typeLabels[activity.type] ?? activity.type}
                          </Badge>
                        </div>
                        {activity.description && (
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {activity.durationMinutes && (
                            <span>{activity.durationMinutes} min</span>
                          )}
                          {totalCredits > 0 && (
                            <span className="font-medium text-emerald-600">
                              {totalCredits} credit{totalCredits !== 1 ? "s" : ""}
                            </span>
                          )}
                          {tags.length > 0 && tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Credit mappings */}
                    {activity.creditMappings.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <div className="flex flex-wrap gap-2">
                          {activity.creditMappings.map((m) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
                            >
                              {m.creditAmount} {m.creditUnit} &middot; {m.creditCategory} &middot; {m.country}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
