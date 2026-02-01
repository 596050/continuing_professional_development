import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError, serverError, withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";

/**
 * Default notification preferences for new users.
 */
const DEFAULT_PREFERENCES = {
  emailReminders: true,
  pushReminders: false,
  reminderFrequency: "weekly" as const,
  quietHoursStart: undefined as number | undefined,
  quietHoursEnd: undefined as number | undefined,
};

type ReminderFrequency = "daily" | "weekly" | "monthly";

interface NotificationPreferences {
  emailReminders: boolean;
  pushReminders: boolean;
  reminderFrequency: ReminderFrequency;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

function parseUserMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function extractPreferences(metadata: Record<string, unknown>): NotificationPreferences {
  const notif = (metadata.notificationPreferences ?? {}) as Partial<NotificationPreferences>;
  return {
    emailReminders: typeof notif.emailReminders === "boolean" ? notif.emailReminders : DEFAULT_PREFERENCES.emailReminders,
    pushReminders: typeof notif.pushReminders === "boolean" ? notif.pushReminders : DEFAULT_PREFERENCES.pushReminders,
    reminderFrequency: isValidFrequency(notif.reminderFrequency) ? notif.reminderFrequency : DEFAULT_PREFERENCES.reminderFrequency,
    quietHoursStart: typeof notif.quietHoursStart === "number" ? notif.quietHoursStart : undefined,
    quietHoursEnd: typeof notif.quietHoursEnd === "number" ? notif.quietHoursEnd : undefined,
  };
}

function isValidFrequency(val: unknown): val is ReminderFrequency {
  return val === "daily" || val === "weekly" || val === "monthly";
}

/**
 * GET /api/settings/notifications
 *
 * Returns the current user's notification preferences.
 * Preferences are stored in the user's metadata JSON field.
 * If no preferences have been set, returns sensible defaults.
 */
export async function GET() {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    // Notification preferences are stored as a special Reminder record
    // with type "notification_preferences" to avoid schema changes.
    const prefRecord = await prisma.reminder.findFirst({
      where: {
        userId: session.user.id,
        type: "notification_preferences",
      },
      orderBy: { createdAt: "desc" },
    });

    let preferences: NotificationPreferences;
    if (prefRecord?.metadata) {
      const meta = parseUserMetadata(prefRecord.metadata);
      preferences = extractPreferences({ notificationPreferences: meta });
    } else {
      preferences = { ...DEFAULT_PREFERENCES };
    }

    return NextResponse.json({ preferences });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PATCH /api/settings/notifications
 *
 * Updates the current user's notification preferences.
 * Accepts partial updates - only the fields you send will be changed.
 */
export async function PATCH(req: NextRequest) {
  try {
    const limited = withRateLimit(req, "settings-notifications", { windowMs: 60_000, max: 10 });
    if (limited) return limited;

    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const body = await req.json();

    // Validate input
    const updates: Partial<NotificationPreferences> = {};

    if (body.emailReminders !== undefined) {
      if (typeof body.emailReminders !== "boolean") {
        return apiError("emailReminders must be a boolean", 400);
      }
      updates.emailReminders = body.emailReminders;
    }

    if (body.pushReminders !== undefined) {
      if (typeof body.pushReminders !== "boolean") {
        return apiError("pushReminders must be a boolean", 400);
      }
      updates.pushReminders = body.pushReminders;
    }

    if (body.reminderFrequency !== undefined) {
      if (!isValidFrequency(body.reminderFrequency)) {
        return apiError("reminderFrequency must be daily, weekly, or monthly", 400);
      }
      updates.reminderFrequency = body.reminderFrequency;
    }

    if (body.quietHoursStart !== undefined) {
      if (body.quietHoursStart !== null && (typeof body.quietHoursStart !== "number" || body.quietHoursStart < 0 || body.quietHoursStart > 23)) {
        return apiError("quietHoursStart must be a number between 0 and 23, or null", 400);
      }
      updates.quietHoursStart = body.quietHoursStart ?? undefined;
    }

    if (body.quietHoursEnd !== undefined) {
      if (body.quietHoursEnd !== null && (typeof body.quietHoursEnd !== "number" || body.quietHoursEnd < 0 || body.quietHoursEnd > 23)) {
        return apiError("quietHoursEnd must be a number between 0 and 23, or null", 400);
      }
      updates.quietHoursEnd = body.quietHoursEnd ?? undefined;
    }

    if (Object.keys(updates).length === 0) {
      return apiError("No valid fields to update", 400);
    }

    // Get current preferences
    const prefRecord = await prisma.reminder.findFirst({
      where: {
        userId: session.user.id,
        type: "notification_preferences",
      },
      orderBy: { createdAt: "desc" },
    });

    let currentPrefs: NotificationPreferences;
    if (prefRecord?.metadata) {
      const meta = parseUserMetadata(prefRecord.metadata);
      currentPrefs = extractPreferences({ notificationPreferences: meta });
    } else {
      currentPrefs = { ...DEFAULT_PREFERENCES };
    }

    // Merge updates
    const merged: NotificationPreferences = { ...currentPrefs, ...updates };

    const prefMetadata = JSON.stringify({
      emailReminders: merged.emailReminders,
      pushReminders: merged.pushReminders,
      reminderFrequency: merged.reminderFrequency,
      quietHoursStart: merged.quietHoursStart,
      quietHoursEnd: merged.quietHoursEnd,
    });

    if (prefRecord) {
      // Update existing record
      await prisma.reminder.update({
        where: { id: prefRecord.id },
        data: { metadata: prefMetadata },
      });
    } else {
      // Create a new preferences record
      await prisma.reminder.create({
        data: {
          userId: session.user.id,
          type: "notification_preferences",
          title: "Notification Preferences",
          message: null,
          triggerDate: new Date(),
          channel: "email",
          status: "sent",
          metadata: prefMetadata,
        },
      });
    }

    return NextResponse.json({ preferences: merged });
  } catch (err) {
    return serverError(err);
  }
}
