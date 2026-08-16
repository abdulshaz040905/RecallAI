import { prisma } from '@/lib/db'
import { DEFAULT_LANGUAGE, isSupportedLanguage, LANGUAGES } from '@/lib/languages'
import {
    segmentsToText,
    toTranscriptSegments,
    translateSegments,
    translateText,
    TranslationError
} from '@/lib/translation'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Long transcripts can take a while to translate.
export const maxDuration = 60

async function getMeetingForUser(meetingId: string, clerkId: string) {
    const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true }
    })

    if (!user) {
        return null
    }

    return prisma.meeting.findFirst({
        where: { id: meetingId, userId: user.id },
        select: {
            id: true,
            transcript: true,
            transcriptText: true,
            summary: true
        }
    })
}

/** Lists the languages a transcript has already been translated into. */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ meetingId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { meetingId } = await params

    const cached = await prisma.transcriptTranslation.findMany({
        where: { meetingId },
        select: { language: true, updatedAt: true }
    })

    return NextResponse.json({
        languages: LANGUAGES,
        available: cached,
        defaultLanguage: DEFAULT_LANGUAGE
    })
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ meetingId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { meetingId } = await params
    const { language, force } = await request.json()

    if (!language || !isSupportedLanguage(language)) {
        return NextResponse.json(
            { error: 'Unsupported or missing language code' },
            { status: 400 }
        )
    }

    try {
        const meeting = await getMeetingForUser(meetingId, userId)

        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
        }

        // Returning the source transcript untouched for the original language
        // avoids a pointless API call and a wasted cache row.
        if (language === DEFAULT_LANGUAGE) {
            const segments = toTranscriptSegments(meeting.transcript)
            return NextResponse.json({
                language,
                cached: false,
                original: true,
                segments,
                text: meeting.transcriptText || segmentsToText(segments),
                summary: meeting.summary
            })
        }

        if (!force) {
            const cached = await prisma.transcriptTranslation.findUnique({
                where: { meetingId_language: { meetingId, language } }
            })

            if (cached) {
                return NextResponse.json({
                    language,
                    cached: true,
                    segments: cached.segments,
                    text: cached.translatedText,
                    summary: cached.translatedSummary,
                    detectedSourceLanguage: cached.detectedSourceLanguage
                })
            }
        }

        const segments = toTranscriptSegments(meeting.transcript)

        if (segments.length === 0 && !meeting.transcriptText) {
            return NextResponse.json(
                { error: 'This meeting has no transcript to translate yet' },
                { status: 400 }
            )
        }

        const sourceTexts = segments.length
            ? segments.map((segment) => segment.text)
            : [meeting.transcriptText ?? '']

        const result = await translateSegments(sourceTexts, language)

        const translatedSegments = segments.length
            ? segments.map((segment, index) => ({
                  ...segment,
                  text: result.translations[index] ?? segment.text
              }))
            : [{ text: result.translations[0] ?? '' }]

        const translatedText = segmentsToText(translatedSegments)

        let translatedSummary: string | null = null
        if (meeting.summary) {
            try {
                translatedSummary = await translateText(meeting.summary, language)
            } catch {
                // A failed summary translation should not fail the transcript.
            }
        }

        const saved = await prisma.transcriptTranslation.upsert({
            where: { meetingId_language: { meetingId, language } },
            update: {
                translatedText,
                segments: translatedSegments,
                translatedSummary,
                detectedSourceLanguage: result.detectedSourceLanguage ?? null,
                characterCount: result.characterCount
            },
            create: {
                meetingId,
                language,
                translatedText,
                segments: translatedSegments,
                translatedSummary,
                detectedSourceLanguage: result.detectedSourceLanguage ?? null,
                characterCount: result.characterCount
            }
        })

        return NextResponse.json({
            language,
            cached: false,
            segments: saved.segments,
            text: saved.translatedText,
            summary: saved.translatedSummary,
            detectedSourceLanguage: saved.detectedSourceLanguage,
            characterCount: saved.characterCount
        })
    } catch (error) {
        if (error instanceof TranslationError) {
            return NextResponse.json({ error: error.message }, { status: error.status ?? 500 })
        }

        console.error('[translate] failed:', error)
        return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
    }
}
