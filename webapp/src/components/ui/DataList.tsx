import { ReactNode } from "react";

export function DataList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-gray-100">{children}</dl>;
}

export function DataRow({
  label,
  value,
  mono,
  capitalize,
  badge,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  capitalize?: boolean;
  badge?: "green" | "red" | "amber" | "gray";
}) {
  const badgeColors = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd
        className={`text-sm font-medium text-gray-900 ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}
      >
        {badge ? (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeColors[badge]}`}
          >
            {value}
          </span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
