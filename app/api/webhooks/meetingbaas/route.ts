import { processMeetingTranscript, transcriptToText } from '@/lib/ai-processor'
import { prisma } from '@/lib/db'
import { sendMeetingSummaryEmail } from '@/lib/email-service-free'
import { computeDurationMinutes, normaliseParticipants } from '@/lib/meeting-filters'
import { processTranscript } from '@/lib/rag'
import { incrementMeetingUsage } from '@/lib/usage'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

/** Speaker names from the bot payload, merged with the invite attendee list. */
function collectParticipants(speakers: unknown, attendees: unknown): string[] {
    const fromSpeakers = Array.isArray(speakers)
        ? speakers.map((speaker: any) =>
              typeof speaker === 'string' ? speaker : (speaker?.name ?? '')
          )
        : []

    const merged = [...fromSpeakers, ...normaliseParticipants(attendees)]
        .map((name) => String(name).trim())
        .filter(Boolean)

    return Array.from(new Set(merged))
}

export async function POST(request: NextRequest) {
    try {
        const webhook = await request.json()

        if (webhook.event !== 'complete') {
            return NextResponse.json({
                success: true,
                message: 'Webhook received, no action needed'
            })
        }

        const webhookData = webhook.data

        const meeting = await prisma.meeting.findFirst({
            where: { botId: webhookData.bot_id },
            include: { user: true }
        })

        if (!meeting) {
            console.error('[webhook] meeting not found for bot id:', webhookData.bot_id)
            return NextResponse.json({ error: 'meeting not found' }, { status: 404 })
        }

        await incrementMeetingUsage(meeting.userId)

        if (!meeting.user.email) {
            console.error('[webhook] user email missing for meeting', meeting.id)
            return NextResponse.json({ error: 'user email not found' }, { status: 400 })
        }

        // Flatten once and reuse — this powers full text search, translation and
        // the RAG pipeline, so it must be stored, not recomputed on every read.
        const transcriptText = transcriptToText(webhookData.transcript)
        const participantNames = collectParticipants(
            webhookData.speakers,
            meeting.attendees
        )

        await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
                meetingEnded: true,
                transcriptReady: true,
                transcript: webhookData.transcript || null,
                transcriptText: transcriptText || null,
                recordingUrl: webhookData.mp4 || null,
                speakers: webhookData.speakers || null,
                participantNames,
                durationMinutes: computeDurationMinutes(
                    meeting.startTime,
                    meeting.endTime
                )
            }
        })

        if (!webhookData.transcript || meeting.processed) {
            return NextResponse.json({
                success: true,
                message: 'Meeting saved',
                meetingId: meeting.id
            })
        }

        try {
            const processed = await processMeetingTranscript(webhookData.transcript)

            // Persist the AI output first so a failing email can't lose it.
            await prisma.meeting.update({
                where: { id: meeting.id },
                data: {
                    summary: processed.summary,
                    actionItems: processed.actionItems,
                    keyDecisions: processed.keyDecisions,
                    topics: processed.topics,
                    processed: true,
                    processedAt: new Date()
                }
            })

            // Email and vector indexing are independent — run them together and
            // let each fail on its own without taking the other down.
            const [emailResult, ragResult] = await Promise.allSettled([
                sendMeetingSummaryEmail({
                    userEmail: meeting.user.email,
                    userName: meeting.user.name || 'User',
                    meetingTitle: meeting.title,
                    summary: processed.summary,
                    actionItems: processed.actionItems,
                    meetingId: meeting.id,
                    meetingDate: meeting.startTime.toLocaleDateString()
                }),
                processTranscript(
                    meeting.id,
                    meeting.userId,
                    transcriptText,
                    meeting.title
                )
            ])

            if (emailResult.status === 'rejected') {
                console.error('[webhook] summary email failed:', emailResult.reason)
            }

            if (ragResult.status === 'rejected') {
                console.error('[webhook] RAG indexing failed:', ragResult.reason)
            }

            await prisma.meeting.update({
                where: { id: meeting.id },
                data: {
                    emailSent: emailResult.status === 'fulfilled',
                    emailSentAt:
                        emailResult.status === 'fulfilled' ? new Date() : undefined,
                    ragProcessed: ragResult.status === 'fulfilled',
                    ragProcessedAt:
                        ragResult.status === 'fulfilled' ? new Date() : undefined
                }
            })
        } catch (processingError) {
            console.error('[webhook] transcript processing failed:', processingError)

            await prisma.meeting.update({
                where: { id: meeting.id },
                data: {
                    processed: true,
                    processedAt: new Date(),
                    summary:
                        'Automatic processing failed. The full transcript is still available above.',
                    actionItems: []
                }
            })
        }

        return NextResponse.json({
            success: true,
            message: 'Meeting processed successfully',
            meetingId: meeting.id
        })
    } catch (error) {
        console.error('[webhook] processing error:', error)
        return NextResponse.json({ error: 'internal server error' }, { status: 500 })
    }
}
