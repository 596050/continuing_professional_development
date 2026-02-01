import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { validationError } from "@/lib/api-utils";
import { resetPasswordSchema } from "@/lib/schemas";

const resetLimiter = rateLimiter({
  windowMs: 15 * 60_000,
  max: process.env.NODE_ENV === "production" ? 5 : 1000,
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (resetLimiter.check(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { token, password } = parsed.data;

    // Find valid reset token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: { gt: new Date() },
        identifier: { startsWith: "reset:" },
      },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const email = verificationToken.identifier.replace("reset:", "");
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    return NextResponse.json({ message: "Password has been reset successfully." });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
