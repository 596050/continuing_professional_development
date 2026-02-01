import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { sendEmail, emailVerificationEmail } from "@/lib/email";
import { validationError, serverError, apiError } from "@/lib/api-utils";
import { signupSchema } from "@/lib/schemas";

const signupLimiter = rateLimiter({
  windowMs: 15 * 60_000,
  max: process.env.NODE_ENV === "production" ? 5 : 1000,
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (signupLimiter.check(ip)) {
      const res = apiError("Too many signup attempts. Please try again later.", 429);
      res.headers.set("Retry-After", "900");
      return res;
    }

    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return apiError("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        passwordHash,
      },
    });

    // Send verification email
    try {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const emailOpts = emailVerificationEmail(name || "", token);
      emailOpts.to = email;
      await sendEmail(emailOpts);
    } catch {
      // Don't block signup if email fails
    }

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (err) {
    return serverError(err);
  }
}
