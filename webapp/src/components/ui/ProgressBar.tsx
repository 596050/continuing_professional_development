const colorThresholds = [
  { min: 100, bar: "bg-emerald-500", text: "text-emerald-700" },
  { min: 60, bar: "bg-blue-500", text: "text-blue-700" },
  { min: 30, bar: "bg-amber-500", text: "text-amber-700" },
  { min: 0, bar: "bg-red-500", text: "text-red-700" },
];

function resolve(pct: number) {
  return colorThresholds.find((t) => pct >= t.min) ?? colorThresholds[3];
}

export function ProgressBar({
  label,
  completed,
  required,
  size = "sm",
}: {
  label?: string;
  completed: number;
  required: number;
  size?: "sm" | "md";
}) {
  const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  const remaining = Math.max(0, required - completed);
  const { bar, text } = resolve(pct);
  const h = size === "sm" ? "h-2" : "h-3";

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-sm font-semibold ${text}`}>
            {completed}/{required}h
          </span>
        </div>
      )}
      <div className={`${label ? "mt-2 " : ""}${h} rounded-full bg-gray-200`}>
        <div
          className={`${h} rounded-full ${bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && remaining > 0 && (
        <p className="mt-1 text-xs text-gray-500">{remaining}h remaining</p>
      )}
      {label && remaining <= 0 && (
        <p className="mt-1 text-xs font-medium text-emerald-600">Complete</p>
      )}
    </div>
  );
}
