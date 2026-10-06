"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

export interface CalendarEvent {
  id: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{ email: string }>;
  location?: string;
  hangoutLink?: string;
  conferenceData?: any;
  botScheduled?: boolean;
  meetingId?: string;
}

export interface PastMeeting {
  id: string;
  title: string;
  description?: string | null;
  meetingUrl: string | null;
  startTime: Date;
  endTime: Date;
  attendees?: any;
  transcriptReady: boolean;
  recordingUrl?: string | null;
  speakers?: any;
}

export function useMeetings() {
  const { userId } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [pastMeetings, setPastMeetings] = useState<PastMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>("");
  const [botToggles, setBotToggles] = useState<{ [key: string]: boolean }>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const pastRequestInFlight = useRef(false);

  const applyUpcomingEvents = (events: CalendarEvent[]) => {
    setUpcomingEvents(events);

    const toggles: Record<string, boolean> = {};

    for (const event of events) {
      toggles[event.id] = event.botScheduled ?? true;
    }

    setBotToggles(toggles);
  };

  useEffect(() => {
    if (userId) {
      fetchUpcomingEvents();
    }
  }, [userId]);

  const fetchUpcomingEvents = async () => {
    setLoading(true);
    setError("");

    try {
      const statusResponse = await fetch("/api/user/calendar-status", {
        cache: "no-store",
      });

      const statusData = await statusResponse.json();

      if (!statusData.connected) {
        setConnected(false);
        setUpcomingEvents([]);
        setError(
          "Calendar not connected. Connect Google Calendar to enable synchronization.",
        );
        return;
      }

      const response = await fetch("/api/meetings/upcoming", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch upcoming meetings");
      }

      applyUpcomingEvents(result.events || []);
      setConnected(result.connected);
    } catch (error) {
      setConnected(false);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch upcoming meetings",
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const refreshUpcomingEvents = async () => {
    setLoading(true)
    setError('')

    try {
        const syncResponse = await fetch('/api/calendar/sync', {
            method: 'POST',
            headers: {
                Accept: 'application/json'
            }
        })

        const syncResult = await syncResponse.json()

        if (!syncResponse.ok) {
            if (syncResult.reconnectRequired) {
                setConnected(false)
                setUpcomingEvents([])
            }

            throw new Error(
                syncResult.error || 'Calendar synchronization failed'
            )
        }

        const meetingsResponse = await fetch(
            '/api/meetings/upcoming',
            {
                cache: 'no-store'
            }
        )

        const meetingsResult = await meetingsResponse.json()

        if (!meetingsResponse.ok) {
            throw new Error(
                meetingsResult.error ||
                    'Failed to load synchronized meetings'
            )
        }

        applyUpcomingEvents(meetingsResult.events || [])
        setConnected(meetingsResult.connected)
        await fetchPastMeetings(false)

        console.info('[calendar-refresh]', {
            created: syncResult.created,
            updated: syncResult.updated,
            deleted: syncResult.deleted,
            skipped: syncResult.skipped
        })
    } catch (error) {
        setError(
            error instanceof Error
                ? error.message
                : 'Calendar refresh failed'
        )
    } finally {
        setLoading(false)
        setInitialLoading(false)
    }
}

  const fetchPastMeetings = useCallback(async (showLoading = true) => {
    if (pastRequestInFlight.current) return;
    pastRequestInFlight.current = true;
    if (showLoading) setPastLoading(true);
    try {
      const response = await fetch("/api/meetings/past", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to fetch past meetings:", result.error);
        return;
      }

      if (result.error) {
        return;
      }
      setPastMeetings(result.meetings as PastMeeting[]);
    } catch (error) {
      console.error("Failed to fetch past meetings:", error);
    } finally {
      pastRequestInFlight.current = false;
      setPastLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    void fetchPastMeetings();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchPastMeetings(false);
      }
    };

    const interval = window.setInterval(refreshWhenVisible, 30_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [userId, fetchPastMeetings]);

  const toggleBot = async (eventId: string) => {
    try {
      const event = upcomingEvents.find((e) => e.id === eventId);
      if (!event?.meetingId) {
        return;
      }

      setBotToggles((prev) => ({
        ...prev,
        [eventId]: !prev[eventId],
      }));

      const response = await fetch(
        `/api/meetings/${event.meetingId}/bot-toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botScheduled: !botToggles[eventId],
          }),
        },
      );

      if (!response.ok) {
        setBotToggles((prev) => ({
          ...prev,
          [eventId]: !prev[eventId],
        }));
      }
    } catch {
      setBotToggles((prev) => ({
        ...prev,
        [eventId]: !prev[eventId],
      }));
    }
  };

  const directOAuth = async () => {
    setLoading(true);
    try {
      window.location.href = "/api/auth/google/direct-connect";
    } catch {
      setError("Failed to start direct OAuth");
      setLoading(false);
    }
  };

  const getAttendeeList = (attendees: any): string[] => {
    if (!attendees) {
      return [];
    }

    try {
      const parsed = JSON.parse(String(attendees));
      if (Array.isArray(parsed)) {
        return parsed.map((name) => String(name).trim());
      }
      return [String(parsed).trim()];
    } catch {
      const attendeeString = String(attendees);
      return attendeeString
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return {
    userId,
    upcomingEvents,
    pastMeetings,
    loading,
    pastLoading,
    connected,
    error,
    botToggles,
    initialLoading,
    fetchUpcomingEvents,
    refreshUpcomingEvents,
    fetchPastMeetings,
    toggleBot,
    directOAuth,
    getAttendeeList,
    getInitials
};
}
