import { prisma } from '@/lib/db'
import { parseSearchParams, resolveFilters } from '@/lib/meeting-filters'
import { auth } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'not authed' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'user not found' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const params = parseSearchParams(searchParams)
        const filters = resolveFilters(params)

        const where: Prisma.MeetingWhereInput = {
            userId: user.id,
            meetingEnded: true
        }

        // --- Date range -----------------------------------------------------
        if (filters.from || filters.to) {
            where.startTime = {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {})
            }
        }

        // --- Duration -------------------------------------------------------
        if (filters.minDuration != null || filters.maxDuration != null) {
            where.durationMinutes = {
                ...(filters.minDuration != null ? { gte: filters.minDuration } : {}),
                ...(filters.maxDuration != null ? { lte: filters.maxDuration } : {})
            }
        }

        // --- Participants ---------------------------------------------------
        // hasSome on the denormalised array is index friendly; we also fall back
        // to a case-insensitive contains so partial names still match.
        if (filters.participants.length > 0) {
            where.AND = [
                {
                    OR: [
                        { participantNames: { hasSome: filters.participants } },
                        ...filters.participants.map((name) => ({
                            participantNames: { has: name }
                        }))
                    ]
                }
            ]
        }

        // --- Free text search ------------------------------------------------
        if (filters.query) {
            const textFilter: Prisma.MeetingWhereInput = {
                OR: [
                    { title: { contains: filters.query, mode: 'insensitive' } },
                    { description: { contains: filters.query, mode: 'insensitive' } },
                    { summary: { contains: filters.query, mode: 'insensitive' } },
                    { transcriptText: { contains: filters.query, mode: 'insensitive' } }
                ]
            }

            where.AND = Array.isArray(where.AND)
                ? [...where.AND, textFilter]
                : [textFilter]
        }

        const [meetings, total] = await Promise.all([
            prisma.meeting.findMany({
                where,
                orderBy: filters.orderBy,
                skip: filters.skip,
                take: filters.take,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    meetingUrl: true,
                    startTime: true,
                    endTime: true,
                    durationMinutes: true,
                    attendees: true,
                    participantNames: true,
                    transcriptReady: true,
                    recordingUrl: true,
                    speakers: true,
                    summary: true
                }
            }),
            prisma.meeting.count({ where })
        ])

        return NextResponse.json({
            meetings,
            total,
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 20,
            totalPages: Math.max(1, Math.ceil(total / (params.pageSize ?? 20))),
            appliedFilters: {
                query: filters.query ?? null,
                from: filters.from,
                to: filters.to,
                minDuration: filters.minDuration ?? null,
                maxDuration: filters.maxDuration ?? null,
                participants: filters.participants
            }
        })
    } catch (error) {
        console.error('[meetings/search] failed:', error)
        return NextResponse.json(
            { error: 'Failed to search meetings', meetings: [], total: 0 },
            { status: 500 }
        )
    }
}
