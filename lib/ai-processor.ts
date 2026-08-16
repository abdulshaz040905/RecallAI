import { generateJSON } from './gemini'

export interface ProcessedMeeting {
    summary: string
    actionItems: Array<{ id: number; text: string }>
    keyDecisions: string[]
    topics: string[]
}

interface GeminiMeetingAnalysis {
    summary?: string
    actionItems?: string[]
    keyDecisions?: string[]
    topics?: string[]
}

/** Normalises the many shapes a transcript can arrive in into flat text. */
export function transcriptToText(transcript: unknown): string {
    if (!transcript) {
        return ''
    }

    if (typeof transcript === 'string') {
        return transcript
    }

    if (Array.isArray(transcript)) {
        return transcript
            .map((item: any) => {
                const speaker = item?.speaker || item?.speakerName || 'Speaker'
                const words = Array.isArray(item?.words)
                    ? item.words.map((w: any) => w?.word ?? '').join(' ')
                    : (item?.text ?? '')
                return `${speaker}: ${words}`.trim()
            })
            .filter(Boolean)
            .join('\n')
    }

    if (typeof transcript === 'object') {
        const obj = transcript as Record<string, unknown>
        if (typeof obj.text === 'string') {
            return obj.text
        }
        if (Array.isArray(obj.segments)) {
            return transcriptToText(obj.segments)
        }
    }

    return ''
}

const SYSTEM_PROMPT = `You analyse meeting transcripts and produce structured, factual output.

Rules:
- Only use information that is actually present in the transcript. Never invent details.
- Action items must be concrete tasks someone committed to, phrased imperatively.
- If a section has nothing to report, return an empty array for it.

Respond with JSON matching exactly this shape:
{
  "summary": "2-4 sentence summary of the discussion and outcomes",
  "actionItems": ["Action item 1", "Action item 2"],
  "keyDecisions": ["Decision 1"],
  "topics": ["Topic 1", "Topic 2"]
}`

export async function processMeetingTranscript(
    transcript: unknown
): Promise<ProcessedMeeting> {
    const fallback: ProcessedMeeting = {
        summary:
            'Meeting transcript processed successfully. Please check the full transcript for details.',
        actionItems: [],
        keyDecisions: [],
        topics: []
    }

    try {
        const transcriptText = transcriptToText(transcript)

        if (!transcriptText.trim()) {
            throw new Error('No transcript content found')
        }

        // Gemini 2.0 Flash has a 1M token window, but we still trim absurdly
        // long transcripts to keep latency and cost predictable.
        const truncated =
            transcriptText.length > 120_000
                ? `${transcriptText.slice(0, 120_000)}\n\n[transcript truncated]`
                : transcriptText

        const parsed = await generateJSON<GeminiMeetingAnalysis>(
            SYSTEM_PROMPT,
            `Analyse this meeting transcript:\n\n${truncated}`,
            { temperature: 0.3, maxOutputTokens: 2048 }
        )

        const actionItems = Array.isArray(parsed.actionItems)
            ? parsed.actionItems
                  .filter((text) => typeof text === 'string' && text.trim().length > 0)
                  .map((text, index) => ({ id: index + 1, text: text.trim() }))
            : []

        return {
            summary: parsed.summary?.trim() || fallback.summary,
            actionItems,
            keyDecisions: Array.isArray(parsed.keyDecisions)
                ? parsed.keyDecisions.filter((d) => typeof d === 'string')
                : [],
            topics: Array.isArray(parsed.topics)
                ? parsed.topics.filter((t) => typeof t === 'string')
                : []
        }
    } catch (error) {
        console.error('[ai-processor] Gemini processing failed:', error)
        return fallback
    }
}
