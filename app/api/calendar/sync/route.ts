import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { computeDurationMinutes } from '@/lib/meeting-filters'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const SYNC_DAYS = 7

interface GoogleCalendarEvent {
    id?: string
    status?: string
    summary?: string
    description?: string
    hangoutLink?: string
    conferenceData?: {
        entryPoints?: Array<{
            entryPointType?: string
            uri?: string
        }>
    }
    start?: {
        dateTime?: string
        date?: string
    }
    end?: {
        dateTime?: string
        date?: string
    }
    attendees?: Array<{
        email?: string
        displayName?: string
    }>
}

interface GoogleEventsResponse {
    items?: GoogleCalendarEvent[]
    nextPageToken?: string
}

interface GoogleTokenResponse {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
}

class CalendarSyncError extends Error {
    status: number
    reconnectRequired: boolean

    constructor(
        message: string,
        status = 500,
        reconnectRequired = false
    ) {
        super(message)
        this.name = 'CalendarSyncError'
        this.status = status
        this.reconnectRequired = reconnectRequired
    }
}

function getMeetingUrl(event: GoogleCalendarEvent): string | null {
    if (event.hangoutLink) {
        return event.hangoutLink
    }

    const videoEntry = event.conferenceData?.entryPoints?.find(
        (entry) =>
            entry.entryPointType === 'video' &&
            typeof entry.uri === 'string'
    )

    return videoEntry?.uri ?? null
}

function getParticipants(event: GoogleCalendarEvent): string[] {
    return Array.from(
        new Set(
            (event.attendees ?? [])
                .map(
                    (attendee) =>
                        attendee.displayName?.trim() ||
                        attendee.email?.trim() ||
                        ''
                )
                .filter(Boolean)
        )
    )
}

function getAttendeeEmails(event: GoogleCalendarEvent): string[] {
    return Array.from(
        new Set(
            (event.attendees ?? [])
                .map((attendee) => attendee.email?.trim() || '')
                .filter(Boolean)
        )
    )
}

async function disconnectCalendar(userId: string) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            calendarConnected: false,
            googleAccessToken: null,
            googleTokenExpiry: null
        }
    })
}

async function refreshGoogleAccessToken(user: {
    id: string
    googleRefreshToken: string | null
}): Promise<string> {
    if (!user.googleRefreshToken) {
        await disconnectCalendar(user.id)

        throw new CalendarSyncError(
            'Google Calendar must be reconnected',
            409,
            true
        )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        throw new CalendarSyncError(
            'Google OAuth is not configured on the server',
            500
        )
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: user.googleRefreshToken,
            grant_type: 'refresh_token'
        }),
        cache: 'no-store'
    })

    const tokenData = (await response.json()) as GoogleTokenResponse

    if (!response.ok || !tokenData.access_token) {
        console.error('[calendar-sync] token refresh failed', {
            status: response.status,
            error: tokenData.error,
            description: tokenData.error_description
        })

        await disconnectCalendar(user.id)

        throw new CalendarSyncError(
            'Google Calendar authorization expired. Reconnect your calendar.',
            409,
            true
        )
    }

    const expiresIn = tokenData.expires_in ?? 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    await prisma.user.update({
        where: { id: user.id },
        data: {
            googleAccessToken: tokenData.access_token,
            googleTokenExpiry: expiresAt,
            calendarConnected: true
        }
    })

    return tokenData.access_token
}

async function getAccessToken(user: {
    id: string
    googleAccessToken: string | null
    googleRefreshToken: string | null
    googleTokenExpiry: Date | null
}): Promise<string> {
    const refreshBefore = Date.now() + 10 * 60 * 1000

    const tokenStillValid =
        user.googleAccessToken &&
        user.googleTokenExpiry &&
        user.googleTokenExpiry.getTime() > refreshBefore

    if (tokenStillValid) {
        return user.googleAccessToken as string
    }

    return refreshGoogleAccessToken(user)
}

async function fetchGoogleEvents(
    accessToken: string,
    timeMin: Date,
    timeMax: Date
): Promise<GoogleCalendarEvent[]> {
    const allEvents: GoogleCalendarEvent[] = []
    let pageToken: string | undefined

    do {
        const url = new URL(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events'
        )

        url.searchParams.set('timeMin', timeMin.toISOString())
        url.searchParams.set('timeMax', timeMax.toISOString())
        url.searchParams.set('singleEvents', 'true')
        url.searchParams.set('orderBy', 'startTime')
        url.searchParams.set('showDeleted', 'true')
        url.searchParams.set('maxResults', '2500')

        if (pageToken) {
            url.searchParams.set('pageToken', pageToken)
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json'
            },
            cache: 'no-store'
        })

        if (response.status === 401 || response.status === 403) {
            throw new CalendarSyncError(
                'Google Calendar authorization expired',
                409,
                true
            )
        }

        if (response.status === 429) {
            throw new CalendarSyncError(
                'Google Calendar is temporarily rate-limiting requests. Try again shortly.',
                429
            )
        }

        if (!response.ok) {
            const body = await response.text()

            console.error('[calendar-sync] Google API failed', {
                status: response.status,
                body
            })

            throw new CalendarSyncError(
                `Google Calendar returned ${response.status}`,
                502
            )
        }

        const data = (await response.json()) as GoogleEventsResponse

        allEvents.push(...(data.items ?? []))
        pageToken = data.nextPageToken
    } while (pageToken)

    return allEvents
}

export async function POST() {
    try {
        const { userId: clerkUserId } = await auth()

        if (!clerkUserId) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: {
                clerkId: clerkUserId
            },
            select: {
                id: true,
                calendarConnected: true,
                googleAccessToken: true,
                googleRefreshToken: true,
                googleTokenExpiry: true
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        if (
            !user.calendarConnected ||
            (!user.googleAccessToken && !user.googleRefreshToken)
        ) {
            return NextResponse.json(
                {
                    error: 'Google Calendar is not connected',
                    reconnectRequired: true
                },
                { status: 409 }
            )
        }

        const accessToken = await getAccessToken(user)

        const now = new Date()
        const timeMax = new Date(
            now.getTime() + SYNC_DAYS * 24 * 60 * 60 * 1000
        )

        let googleEvents: GoogleCalendarEvent[]

        try {
            googleEvents = await fetchGoogleEvents(
                accessToken,
                now,
                timeMax
            )
        } catch (error) {
            if (
                error instanceof CalendarSyncError &&
                error.reconnectRequired
            ) {
                await disconnectCalendar(user.id)
            }

            throw error
        }

        const existingMeetings = await prisma.meeting.findMany({
            where: {
                userId: user.id,
                isFromCalendar: true,
                startTime: {
                    gte: now,
                    lt: timeMax
                }
            },
            select: {
                id: true,
                userId: true,
                calendarEventId: true,
                botSent: true
            }
        })

        const seenGoogleEventIds = new Set<string>()

        let created = 0
        let updated = 0
        let deleted = 0
        let skipped = 0

        for (const event of googleEvents) {
            if (!event.id) {
                skipped += 1
                continue
            }

            seenGoogleEventIds.add(event.id)

            const existing = await prisma.meeting.findUnique({
                where: {
                    calendarEventId: event.id
                },
                select: {
                    id: true,
                    userId: true,
                    botSent: true
                }
            })

            /*
             * Meeting.calendarEventId is globally unique in the current
             * Prisma schema. Never modify another user's meeting.
             */
            if (existing && existing.userId !== user.id) {
                skipped += 1
                continue
            }

            if (event.status === 'cancelled') {
                if (existing && !existing.botSent) {
                    await prisma.meeting.delete({
                        where: {
                            id: existing.id
                        }
                    })

                    deleted += 1
                } else if (existing) {
                    await prisma.meeting.update({
                        where: {
                            id: existing.id
                        },
                        data: {
                            botScheduled: false
                        }
                    })

                    updated += 1
                }

                continue
            }

            const meetingUrl = getMeetingUrl(event)
            const startDateTime = event.start?.dateTime
            const endDateTime = event.end?.dateTime

            /*
             * Ignore all-day events and calendar entries without a video
             * meeting URL.
             */
            if (!meetingUrl || !startDateTime || !endDateTime) {
                if (existing && !existing.botSent) {
                    await prisma.meeting.update({
                        where: {
                            id: existing.id
                        },
                        data: {
                            botScheduled: false
                        }
                    })
                }

                skipped += 1
                continue
            }

            const startTime = new Date(startDateTime)
            const endTime = new Date(endDateTime)
            const attendees = getAttendeeEmails(event)
            const participantNames = getParticipants(event)

            const meetingData = {
                title: event.summary?.trim() || 'Untitled Meeting',
                description: event.description || null,
                meetingUrl,
                startTime,
                endTime,
                attendees: JSON.stringify(attendees),
                participantNames,
                durationMinutes: computeDurationMinutes(
                    startTime,
                    endTime
                ),
                isFromCalendar: true
            }

            if (existing) {
                await prisma.meeting.update({
                    where: {
                        id: existing.id
                    },
                    data: meetingData
                })

                updated += 1
            } else {
                await prisma.meeting.create({
                    data: {
                        ...meetingData,
                        calendarEventId: event.id,
                        userId: user.id,
                        botScheduled: true,
                        botSent: false
                    }
                })

                created += 1
            }
        }

        /*
         * Delete meetings that disappeared from Google, but only inside the
         * same seven-day window. Keep already-sent meetings so their webhook
         * can still locate the database record.
         */
        for (const meeting of existingMeetings) {
            if (
                meeting.calendarEventId &&
                !seenGoogleEventIds.has(meeting.calendarEventId)
            ) {
                if (!meeting.botSent) {
                    await prisma.meeting.delete({
                        where: {
                            id: meeting.id
                        }
                    })

                    deleted += 1
                } else {
                    await prisma.meeting.update({
                        where: {
                            id: meeting.id
                        },
                        data: {
                            botScheduled: false
                        }
                    })

                    updated += 1
                }
            }
        }

        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                calendarConnected: true
            }
        })

        return NextResponse.json({
            success: true,
            created,
            updated,
            deleted,
            skipped,
            totalFromGoogle: googleEvents.length,
            syncedAt: new Date().toISOString()
        })
    } catch (error) {
        console.error('[calendar-sync] failed:', error)

        if (error instanceof CalendarSyncError) {
            return NextResponse.json(
                {
                    error: error.message,
                    reconnectRequired: error.reconnectRequired
                },
                { status: error.status }
            )
        }

        return NextResponse.json(
            {
                error: 'Calendar synchronization failed'
            },
            { status: 500 }
        )
    }
}