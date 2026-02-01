/**
 * Shared API utilities — auth checks, error formatting, rate-limit headers.
 *
 * Usage:
 *   import { requireAuth, apiError, withRateLimit } from "@/lib/api-utils";
 *
 *   export async function GET() {
 *     const session = requireAuth();
 *     if (session instanceof NextResponse) return session;
 *     // session.user.id is guaranteed
 *   }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import type { ZodError } from "zod";

// ---------------------------------------------------------------------------
// Session type with guaranteed id
// ---------------------------------------------------------------------------
export interface AuthenticatedSession {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    plan?: string;
    role?: string;
    firmId?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Auth check — returns session or 401 response
// ---------------------------------------------------------------------------
export async function requireAuth(): Promise<AuthenticatedSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return session as any as AuthenticatedSession;
}

export async function requireRole(
  ...roles: string[]
): Promise<AuthenticatedSession | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const session = result as AuthenticatedSession;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role as string | undefined;
  if (!role || !roles.includes(role)) {
    return NextResponse.json(
      { error: "Insufficient permissions", code: "FORBIDDEN" },
      { status: 403 }
    );
  }
  return session;
}

// ---------------------------------------------------------------------------
// Standardised error responses
// ---------------------------------------------------------------------------
export function apiError(
  message: string,
  status: number,
  code?: string
): NextResponse {
  return NextResponse.json(
    { error: message, code: code ?? httpStatusCode(status) },
    { status }
  );
}

export function validationError(err: ZodError): NextResponse {
  const issues = err.issues.map((i) => ({
    field: i.path.join("."),
    message: i.message,
  }));
  return NextResponse.json(
    { error: "Validation failed", code: "VALIDATION_ERROR", issues },
    { status: 400 }
  );
}

export function serverError(err?: unknown): NextResponse {
  if (err && process.env.NODE_ENV !== "production") {
    console.error("[API Error]", err);
  }
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

// ---------------------------------------------------------------------------
// Rate limiting with headers
// ---------------------------------------------------------------------------
const limiters = new Map<string, ReturnType<typeof rateLimiter>>();

function getLimiter(name: string, windowMs: number, max: number) {
  const key = `${name}:${windowMs}:${max}`;
  if (!limiters.has(key)) {
    const prodMax = process.env.NODE_ENV === "production" ? max : Math.max(max * 100, 1000);
    limiters.set(key, rateLimiter({ windowMs, max: prodMax }));
  }
  return limiters.get(key)!;
}

export function withRateLimit(
  req: Request,
  name: string,
  opts: { windowMs?: number; max?: number } = {}
): NextResponse | null {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 30;
  const limiter = getLimiter(name, windowMs, max);
  const ip = getClientIp(req);
  const isLimited = limiter.check(ip);
  const remaining = limiter.remaining(ip);

  if (isLimited) {
    const res = NextResponse.json(
      { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
      { status: 429 }
    );
    res.headers.set("RateLimit-Limit", String(max));
    res.headers.set("RateLimit-Remaining", "0");
    res.headers.set("Retry-After", String(Math.ceil(windowMs / 1000)));
    return res;
  }

  // Return null = not limited; caller should add headers to final response
  // We store remaining in a WeakMap-style approach via req, but simpler to just return null
  return null;
}

export function rateLimitHeaders(
  response: NextResponse,
  req: Request,
  name: string,
  opts: { windowMs?: number; max?: number } = {}
): NextResponse {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 30;
  const limiter = getLimiter(name, windowMs, max);
  const ip = getClientIp(req);
  const remaining = limiter.remaining(ip);
  response.headers.set("RateLimit-Limit", String(max));
  response.headers.set("RateLimit-Remaining", String(remaining));
  return response;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function httpStatusCode(status: number): string {
  const codes: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
  };
  return codes[status] ?? "ERROR";
}
