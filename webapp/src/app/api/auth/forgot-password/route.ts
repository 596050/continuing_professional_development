import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { validationError } from "@/lib/api-utils";
import { forgotPasswordSchema } from "@/lib/schemas";

const resetLimiter = rateLimiter({
  windowMs: 15 * 60_000,
  max: process.env.NODE_ENV === "production" ? 3 : 1000,
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (resetLimiter.check(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: {
          identifier: `reset:${email}`,
          token,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const emailOpts = passwordResetEmail(user.name || "", token);
      emailOpts.to = email;
      await sendEmail(emailOpts);
    }

    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
