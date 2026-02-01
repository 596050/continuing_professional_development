type BadgeVariant =
  | "blue"
  | "green"
  | "red"
  | "amber"
  | "gray"
  | "purple";

type BadgeShape = "pill" | "rounded";

const variantClasses: Record<BadgeVariant, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  gray: "bg-gray-100 text-gray-600",
  purple: "bg-purple-50 text-purple-600",
};

const shapeClasses: Record<BadgeShape, string> = {
  pill: "rounded-full",
  rounded: "rounded",
};

export function Badge({
  children,
  variant = "gray",
  shape = "pill",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  shape?: "pill" | "rounded";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${shapeClasses[shape]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Convenience: status badge for CPD records */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    completed: "green",
    active: "green",
    in_progress: "blue",
    pending: "amber",
    planned: "gray",
    upcoming: "gray",
    revoked: "red",
    failed: "red",
    dismissed: "gray",
    sent: "green",
  };

  return (
    <span role="status">
      <Badge variant={map[status] ?? "gray"} shape="pill" className="px-2.5 py-1">
        {status === "in_progress" ? "in progress" : status}
      </Badge>
    </span>
  );
}
