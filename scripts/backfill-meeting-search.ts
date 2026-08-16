/**
 * One-time backfill for the search/filter columns added in this release.
 *
 * Meetings recorded before this change have `durationMinutes = 0`,
 * `participantNames = []` and `transcriptText = null`, which makes them
 * invisible to duration/participant filters and full-text search.
 *
 * Run once after `prisma db push`:
 *   npx tsx scripts/backfill-meeting-search.ts
 *
 * Safe to re-run — it only touches rows that are still missing data.
 */

import { PrismaClient } from '@prisma/client'
import { transcriptToText } from '../lib/ai-processor'
import { computeDurationMinutes, normaliseParticipants } from '../lib/meeting-filters'

const prisma = new PrismaClient()

const BATCH_SIZE = 100

function speakerNames(speakers: unknown): string[] {
    if (!Array.isArray(speakers)) {
        return []
    }

    return speakers
        .map((speaker: any) =>
            typeof speaker === 'string' ? speaker : (speaker?.name ?? '')
        )
        .map((name: string) => name.trim())
        .filter(Boolean)
}

async function main() {
    let cursor: string | undefined
    let processed = 0
    let updated = 0

    console.log('Backfilling meeting search columns…\n')

    for (;;) {
        const meetings = await prisma.meeting.findMany({
            take: BATCH_SIZE,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { id: 'asc' },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                attendees: true,
                speakers: true,
                transcript: true,
                transcriptText: true,
                durationMinutes: true,
                participantNames: true
            }
        })

        if (meetings.length === 0) {
            break
        }

        cursor = meetings[meetings.length - 1].id
        processed += meetings.length

        for (const meeting of meetings) {
            const durationMinutes = computeDurationMinutes(
                meeting.startTime,
                meeting.endTime
            )

            const participantNames = Array.from(
                new Set([
                    ...speakerNames(meeting.speakers),
                    ...normaliseParticipants(meeting.attendees)
                ])
            )

            const transcriptText =
                meeting.transcriptText || transcriptToText(meeting.transcript) || null

            const needsUpdate =
                meeting.durationMinutes !== durationMinutes ||
                meeting.participantNames.length !== participantNames.length ||
                (!meeting.transcriptText && !!transcriptText)

            if (!needsUpdate) {
                continue
            }

            await prisma.meeting.update({
                where: { id: meeting.id },
                data: { durationMinutes, participantNames, transcriptText }
            })

            updated++
        }

        process.stdout.write(`  processed ${processed}, updated ${updated}\r`)
    }

    console.log(`\n\nDone. Scanned ${processed} meetings, updated ${updated}.`)
}

main()
    .catch((error) => {
        console.error('Backfill failed:', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
