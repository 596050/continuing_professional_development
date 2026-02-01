import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

// POST /api/push/subscribe - Save push subscription for user
export async function POST(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "push-subscribe", { windowMs: 60_000, max: 10 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }

    // Store subscription as JSON in the user's pushSubscription field
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        pushSubscription: JSON.stringify({ endpoint, keys }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/push/subscribe - Remove push subscription
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pushSubscription: null },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
