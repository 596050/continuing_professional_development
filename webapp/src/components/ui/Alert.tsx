import { ReactNode } from "react";

type AlertVariant = "success" | "error" | "warning" | "info";

const variants: Record<AlertVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function Alert({
  variant = "info",
  children,
  className = "",
}: {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={`rounded-lg border p-3 text-sm ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
