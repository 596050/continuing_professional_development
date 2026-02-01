"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/evidence", label: "Evidence" },
  { href: "/reminders", label: "Reminders" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({
  maxWidth = "max-w-7xl",
  children,
}: {
  maxWidth?: string;
  children?: ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className={`mx-auto flex items-center justify-between px-6 py-3 ${maxWidth}`}>
        <div className="flex items-center gap-8">
          <a
            href="/"
            className="text-lg font-bold tracking-tight text-gray-900"
          >
            Audit<span className="text-blue-600">Ready</span>CPD
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {children}
          {session?.user && (
            <>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Sign out
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                {(session.user.name || session.user.email || "U").charAt(0).toUpperCase()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
