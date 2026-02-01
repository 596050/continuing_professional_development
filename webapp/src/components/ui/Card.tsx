import { HTMLAttributes } from "react";

type CardVariant = "default" | "success" | "error" | "warning" | "info";

const variantClasses: Record<CardVariant, string> = {
  default: "border-gray-200 bg-white",
  success: "border-emerald-200 bg-emerald-50",
  error: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-blue-200 bg-blue-50",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  variant = "default",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl border ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...props}
    />
  );
}

export function StatsCard({
  label,
  value,
  sub,
  valueColor = "text-gray-900",
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <Card>
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-sm text-gray-500">{sub}</div>}
    </Card>
  );
}
