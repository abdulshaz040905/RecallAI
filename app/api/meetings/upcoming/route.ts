import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

function normaliseAttendees(value: unknown): Array<{ email: string }> {
  if (!value) {
    return [];
  }

  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((attendee) => {
      if (typeof attendee === "string") {
        return { email: attendee };
      }

      if (
        attendee &&
        typeof attendee === "object" &&
        "email" in attendee &&
        typeof attendee.email === "string"
      ) {
        return { email: attendee.email };
      }

      return null;
    })
    .filter((attendee): attendee is { email: string } => attendee !== null);
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        userId: user.id,
        startTime: { gte: now },
        isFromCalendar: true,
      },
      orderBy: { startTime: "asc" },
      take: 10,
    });

    const events = upcomingMeetings.map((meeting) => ({
      id: meeting.calendarEventId || meeting.id,
      summary: meeting.title,
      start: {
        dateTime: meeting.startTime.toISOString(),
      },
      end: {
        dateTime: meeting.endTime.toISOString(),
      },
      attendees: normaliseAttendees(meeting.attendees),
      hangoutLink: meeting.meetingUrl,
      conferenceData: meeting.meetingUrl
        ? {
            entryPoints: [
              {
                uri: meeting.meetingUrl,
              },
            ],
          }
        : null,
      botScheduled: meeting.botScheduled,
      meetingId: meeting.id,
    }));

    return NextResponse.json({
      events,
      connected: user.calendarConnected,
      source: "database",
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch meetings",
        events: [],
        connected: false,
      },
      { status: 500 },
    );
  }
}
