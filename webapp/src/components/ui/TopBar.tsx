import { ReactNode } from "react";

export function TopBar({
  maxWidth = "max-w-7xl",
  children,
}: {
  maxWidth?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className={`mx-auto flex items-center justify-between px-6 py-4 ${maxWidth}`}>
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-gray-900"
        >
          Audit<span className="text-blue-600">Ready</span>CPD
        </a>
        {children && <div className="flex items-center gap-4">{children}</div>}
      </div>
    </div>
  );
}

export function TopBarLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-gray-600 hover:text-gray-900"
    >
      {children}
    </a>
  );
}
