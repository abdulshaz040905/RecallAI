import { prisma } from '@/lib/db'
import { normaliseParticipants } from '@/lib/meeting-filters'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Distinct participants across the signed-in user's meetings, used to populate
 * the participant filter. Falls back to parsing the JSON `attendees` column for
 * meetings recorded before `participantNames` was denormalised.
 */
export async function GET() {
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
            return NextResponse.json({ participants: [] })
        }

        const meetings = await prisma.meeting.findMany({
            where: { userId: user.id },
            select: { participantNames: true, attendees: true },
            take: 500,
            orderBy: { startTime: 'desc' }
        })

        const counts = new Map<string, number>()

        for (const meeting of meetings) {
            const names = meeting.participantNames?.length
                ? meeting.participantNames
                : normaliseParticipants(meeting.attendees)

            for (const name of names) {
                counts.set(name, (counts.get(name) ?? 0) + 1)
            }
        }

        const participants = Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

        return NextResponse.json({ participants })
    } catch (error) {
        console.error('[meetings/participants] failed:', error)
        return NextResponse.json({ participants: [] }, { status: 500 })
    }
}
