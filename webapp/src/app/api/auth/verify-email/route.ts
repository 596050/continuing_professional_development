import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/api-utils";
import { verifyEmailSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifyEmailSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { token } = parsed.data;

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: { gt: new Date() },
        identifier: { not: { startsWith: "reset:" } }, // Exclude password reset tokens
      },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    const email = verificationToken.identifier;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Delete used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    return NextResponse.json({ message: "Email verified successfully." });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
