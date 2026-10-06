import { processMeetingTranscript, transcriptToText } from '@/lib/ai-processor'
import { prisma } from '@/lib/db'
import { computeDurationMinutes, normaliseParticipants } from '@/lib/meeting-filters'
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

        if (!webhook || typeof webhook !== 'object' || Array.isArray(webhook)) {
            return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
        }

        // v1 completion payloads can carry their fields in `data` or at the root.
        const webhookData =
            webhook.data && typeof webhook.data === 'object' && !Array.isArray(webhook.data)
                ? webhook.data
                : webhook
        const event = webhook.event ?? webhookData.event
        const botId = webhookData.bot_id ?? webhook.bot_id

        console.info('[meetingbaas-webhook] received', {
            event,
            botId: typeof botId === 'string' ? botId : null
        })

        if (event !== 'complete') {
            return NextResponse.json({
                success: true,
                message: 'Webhook received, no action needed'
            })
        }

        if (typeof botId !== 'string' || !botId.trim()) {
            return NextResponse.json({ error: 'Completion webhook is missing bot_id' }, { status: 400 })
        }

        const meeting = await prisma.meeting.findFirst({
            where: { botId },
            include: { user: true }
        })

        if (!meeting) {
            console.error('[webhook] meeting not found for bot id:', botId)
            return NextResponse.json({ error: 'meeting not found' }, { status: 404 })
        }

        // Flatten once and reuse — this powers full text search, translation and
        // the RAG pipeline, so it must be stored, not recomputed on every read.
        const transcript = webhookData.transcript ?? meeting.transcript
        const speakers = webhookData.speakers ?? meeting.speakers
        const transcriptText = transcriptToText(transcript)
        const recordingUrl = webhookData.mp4 ?? webhookData.recording_url
        const participantNames = collectParticipants(
            speakers,
            meeting.attendees
        )

        await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
                meetingEnded: true,
                transcriptReady: Boolean(transcriptText.trim()) || meeting.transcriptReady,
                transcript: transcript ?? undefined,
                transcriptText: transcriptText || undefined,
                recordingUrl: typeof recordingUrl === 'string' && recordingUrl
                    ? recordingUrl
                    : undefined,
                speakers: speakers ?? undefined,
                participantNames,
                durationMinutes: computeDurationMinutes(
                    meeting.startTime,
                    meeting.endTime
                )
            }
        })

        console.info('[meetingbaas-webhook] completion saved', {
            meetingId: meeting.id,
            botId,
            transcriptReady: Boolean(transcriptText.trim()) || meeting.transcriptReady
        })

        if (!transcriptText.trim() || meeting.processed) {
            return NextResponse.json({
                success: true,
                message: 'Meeting saved',
                meetingId: meeting.id
            })
        }

        try {
            const processed = await processMeetingTranscript(transcript)

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
            // load their integrations after saving completion and the summary.
            const [emailResult, ragResult] = await Promise.allSettled([
                (async () => {
                    if (meeting.emailSent) return true

                    const userEmail = meeting.user.email
                    if (!userEmail) {
                        console.warn('[webhook] summary email skipped: user email missing', meeting.id)
                        return false
                    }

                    const { sendMeetingSummaryEmail } = await import('@/lib/email-service-free')
                    await sendMeetingSummaryEmail({
                        userEmail,
                        userName: meeting.user.name || 'User',
                        meetingTitle: meeting.title,
                        summary: processed.summary,
                        actionItems: processed.actionItems,
                        meetingId: meeting.id,
                        meetingDate: meeting.startTime.toLocaleDateString()
                    })
                    return true
                })(),
                (async () => {
                    if (meeting.ragProcessed) return

                    const { processTranscript } = await import('@/lib/rag')
                    await processTranscript(
                        meeting.id,
                        meeting.userId,
                        transcriptText,
                        meeting.title
                    )
                })()
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
                    emailSent: emailResult.status === 'fulfilled' && emailResult.value,
                    emailSentAt:
                        emailResult.status === 'fulfilled' && emailResult.value
                            ? meeting.emailSentAt ?? new Date()
                            : undefined,
                    ragProcessed: ragResult.status === 'fulfilled',
                    ragProcessedAt:
                        ragResult.status === 'fulfilled'
                            ? meeting.ragProcessedAt ?? new Date()
                            : undefined
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
