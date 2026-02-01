import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs inline scripts
      "style-src 'self' 'unsafe-inline'", // Tailwind injects styles
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com",
    ].join("; ")
  );

  // Request logging (simple structured format)
  if (process.env.NODE_ENV === "production") {
    const start = Date.now();
    const method = request.method;
    const path = request.nextUrl.pathname;
    // Log after response (best-effort timing)
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        method,
        path,
        ua: request.headers.get("user-agent")?.substring(0, 100),
      })
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
