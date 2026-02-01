"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/evidence", label: "Evidence" },
  { href: "/activities", label: "Activities" },
  { href: "/reminders", label: "Reminders" },
  { href: "/settings", label: "Settings" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<{
    id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    read: boolean;
    createdAt: string;
  }[]>([]);

  useEffect(() => {
    fetch("/api/notifications?limit=5")
      .then((r) => r.ok ? r.json() : { notifications: [], unreadCount: 0 })
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <a
                    key={n.id}
                    href={n.link ?? "#"}
                    className={`block border-b border-gray-50 px-4 py-3 text-sm transition hover:bg-gray-50 ${
                      n.read ? "opacity-60" : ""
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
                      <div>
                        <p className="font-medium text-gray-900">{n.title}</p>
                        {n.message && <p className="mt-0.5 text-xs text-gray-500">{n.message}</p>}
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppNav({
  maxWidth = "max-w-7xl",
  children,
}: {
  maxWidth?: string;
  children?: ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className={`mx-auto flex items-center justify-between px-6 py-3 ${maxWidth}`}>
        <div className="flex items-center gap-8">
          <a
            href="/"
            className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100"
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
          <ThemeToggle />
          {session?.user && <NotificationBell />}
          {session?.user && (
            <>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden cursor-pointer text-sm text-gray-500 hover:text-gray-700 transition md:block"
              >
                Sign out
              </button>
              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 md:flex">
                {(session.user.name || session.user.email || "U").charAt(0).toUpperCase()}
              </div>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-6 py-4 md:hidden">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
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
          {session?.user && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  {(session.user.name || session.user.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{session.user.name || "User"}</p>
                  <p className="text-gray-500">{session.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-3 cursor-pointer text-sm font-medium text-red-600 hover:text-red-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
