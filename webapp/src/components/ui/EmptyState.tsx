import { ReactNode } from "react";

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
      <p className="text-sm text-gray-500">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
