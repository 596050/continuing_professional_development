import { NextRequest, NextResponse } from "next/server";
import { requireAuth, validationError, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { markNotificationsReadSchema, parsePagination } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const { limit } = parsePagination(searchParams);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (unreadOnly) where.read = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const body = await req.json();
    const parsed = markNotificationsReadSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    if ("all" in data) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: {
          id: { in: data.ids },
          userId: session.user.id,
        },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
