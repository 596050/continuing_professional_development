/**
 * Simple in-memory rate limiter for API routes.
 *
 * Usage:
 *   import { rateLimiter } from "@/lib/rate-limit";
 *
 *   const limiter = rateLimiter({ windowMs: 60_000, max: 5 });
 *
 *   export async function POST(req: NextRequest) {
 *     const limited = limiter.check(getClientIp(req));
 *     if (limited) {
 *       return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 *     }
 *     // ... handle request
 *   }
 */

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private max: number;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.max = config.max;

    // Cleanup expired entries every 60s
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    // Unref so the interval doesn't prevent process exit
    if (typeof this.cleanupInterval === "object" && "unref" in this.cleanupInterval) {
      this.cleanupInterval.unref();
    }
  }

  /** Returns true if the key is rate-limited (over the max). */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return false;
    }

    entry.count++;
    if (entry.count > this.max) {
      return true;
    }

    return false;
  }

  /** Returns remaining attempts for a key. */
  remaining(key: string): number {
    const entry = this.store.get(key);
    if (!entry || Date.now() >= entry.resetAt) return this.max;
    return Math.max(0, this.max - entry.count);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

export function rateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/** Extract client IP from request headers (works with Next.js). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
