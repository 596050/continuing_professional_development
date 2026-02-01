import { NextRequest, NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import ical, { ICalAlarmType } from "ical-generator";

// GET /api/reminders/ics - generate .ics calendar file for all pending reminders
// Optional ?id=xxx to generate for a single reminder
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const reminderId = searchParams.get("id");

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (reminderId) {
      where.id = reminderId;
    } else {
      // Only include pending/active reminders in bulk export
      where.status = "pending";
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { triggerDate: "asc" },
    });

    if (reminders.length === 0) {
      return NextResponse.json(
        { error: "No reminders found" },
        { status: 404 }
      );
    }

    // Get user info for calendar metadata
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const calendar = ical({
      name: "AuditReadyCPD Reminders",
      prodId: { company: "AuditReadyCPD", product: "CPD Reminders" },
    });

    for (const reminder of reminders) {
      const event = calendar.createEvent({
        start: reminder.triggerDate,
        end: new Date(reminder.triggerDate.getTime() + 30 * 60 * 1000), // 30 min duration
        summary: reminder.title,
        description: reminder.message ?? `CPD ${reminder.type} reminder`,
        organizer: {
          name: "AuditReadyCPD",
          email: "reminders@auditreadycpd.com",
        },
      });

      if (user?.email) {
        event.createAttendee({
          email: user.email,
          name: user.name ?? undefined,
        });
      }

      // Add alarm: 1 day before for deadlines, 1 hour before for others
      const alarmMinutes = reminder.type === "deadline" ? 24 * 60 : 60;
      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: alarmMinutes * 60, // seconds before
        description: `Reminder: ${reminder.title}`,
      });

      // For deadline reminders, add a second alarm 1 week before
      if (reminder.type === "deadline") {
        event.createAlarm({
          type: ICalAlarmType.display,
          trigger: 7 * 24 * 60 * 60, // 1 week in seconds
          description: `Upcoming deadline: ${reminder.title}`,
        });
      }
    }

    const icsContent = calendar.toString();
    const filename = reminderId
      ? `cpd_reminder_${reminderId}.ics`
      : `cpd_reminders_${new Date().toISOString().slice(0, 10)}.ics`;

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(Buffer.byteLength(icsContent, "utf-8")),
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
