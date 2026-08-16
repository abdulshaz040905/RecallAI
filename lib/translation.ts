import { isSupportedLanguage } from './languages'

/**
 * Google Cloud Translation API (v2 REST) wrapper.
 *
 * Auth uses a simple API key (GOOGLE_TRANSLATE_API_KEY) so no service-account
 * JSON juggling is needed in serverless environments.
 *
 * The v2 endpoint accepts up to 128 `q` values and ~30k characters per request,
 * so we batch aggressively — a 60-minute transcript is a few hundred segments
 * and would otherwise be a few hundred HTTP round trips.
 */

const TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2'
const DETECT_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2/detect'

/** Google's hard limits per request. */
export const MAX_SEGMENTS_PER_REQUEST = 128
export const MAX_CHARS_PER_REQUEST = 28_000

export class TranslationError extends Error {
    constructor(
        message: string,
        public readonly status?: number
    ) {
        super(message)
        this.name = 'TranslationError'
    }
}

function getApiKey(): string {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY

    if (!key) {
        throw new TranslationError(
            'GOOGLE_TRANSLATE_API_KEY is not set. Enable the Cloud Translation API in Google Cloud and add an API key to your .env file.'
        )
    }

    return key
}

/**
 * Splits segments into request-sized batches, respecting BOTH the segment count
 * and total character limits. Exported for unit testing.
 */
export function batchSegments(
    segments: string[],
    maxSegments: number = MAX_SEGMENTS_PER_REQUEST,
    maxChars: number = MAX_CHARS_PER_REQUEST
): string[][] {
    const batches: string[][] = []
    let current: string[] = []
    let currentChars = 0

    for (const segment of segments) {
        const length = segment.length

        const wouldExceed =
            current.length >= maxSegments ||
            (current.length > 0 && currentChars + length > maxChars)

        if (wouldExceed) {
            batches.push(current)
            current = []
            currentChars = 0
        }

        current.push(segment)
        currentChars += length
    }

    if (current.length > 0) {
        batches.push(current)
    }

    return batches
}

export interface TranslateResult {
    translations: string[]
    detectedSourceLanguage?: string
    characterCount: number
}

/** Translates an array of strings, preserving order and array length. */
export async function translateSegments(
    segments: string[],
    targetLanguage: string,
    sourceLanguage?: string
): Promise<TranslateResult> {
    if (!isSupportedLanguage(targetLanguage)) {
        throw new TranslationError(`Unsupported target language: ${targetLanguage}`)
    }

    // Google rejects empty strings; keep placeholders so indexes line up.
    const nonEmptyIndexes: number[] = []
    const payloadSegments: string[] = []

    segments.forEach((segment, index) => {
        if (segment && segment.trim().length > 0) {
            nonEmptyIndexes.push(index)
            payloadSegments.push(segment)
        }
    })

    if (payloadSegments.length === 0) {
        return { translations: [...segments], characterCount: 0 }
    }

    const apiKey = getApiKey()
    const batches = batchSegments(payloadSegments)

    const translated: string[] = []
    let detectedSourceLanguage: string | undefined
    let characterCount = 0

    for (const batch of batches) {
        const response = await fetch(`${TRANSLATE_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: batch,
                target: targetLanguage,
                format: 'text',
                ...(sourceLanguage ? { source: sourceLanguage } : {})
            })
        })

        const data = await response.json()

        if (!response.ok) {
            const message =
                data?.error?.message || `Translation failed with status ${response.status}`
            console.error('[translation] request failed:', message)
            throw new TranslationError(message, response.status)
        }

        const items = data?.data?.translations ?? []

        for (const item of items) {
            translated.push(item.translatedText ?? '')
            if (!detectedSourceLanguage && item.detectedSourceLanguage) {
                detectedSourceLanguage = item.detectedSourceLanguage
            }
        }

        characterCount += batch.reduce((sum, text) => sum + text.length, 0)
    }

    // Stitch results back into the original shape.
    const output = [...segments]
    nonEmptyIndexes.forEach((originalIndex, i) => {
        output[originalIndex] = translated[i] ?? segments[originalIndex]
    })

    return { translations: output, detectedSourceLanguage, characterCount }
}

/** Convenience wrapper for a single string. */
export async function translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
): Promise<string> {
    const result = await translateSegments([text], targetLanguage, sourceLanguage)
    return result.translations[0] ?? text
}

export async function detectLanguage(text: string): Promise<string | null> {
    const apiKey = getApiKey()

    const response = await fetch(`${DETECT_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text.slice(0, 2000) })
    })

    if (!response.ok) {
        return null
    }

    const data = await response.json()
    return data?.data?.detections?.[0]?.[0]?.language ?? null
}

export interface TranscriptSegment {
    speaker?: string
    text: string
    start?: number
    end?: number
}

/**
 * Flattens the various transcript shapes into `{ speaker, text }` segments so
 * translation can preserve speaker attribution rather than mangling one blob.
 */
export function toTranscriptSegments(transcript: unknown): TranscriptSegment[] {
    if (!transcript) {
        return []
    }

    if (typeof transcript === 'string') {
        return transcript
            .split('\n')
            .filter((line) => line.trim().length > 0)
            .map((line) => {
                const match = line.match(/^([^:]{1,60}):\s*(.*)$/)
                return match
                    ? { speaker: match[1].trim(), text: match[2] }
                    : { text: line }
            })
    }

    if (Array.isArray(transcript)) {
        return transcript
            .map((item: any) => {
                const text = Array.isArray(item?.words)
                    ? item.words.map((w: any) => w?.word ?? '').join(' ')
                    : (item?.text ?? '')

                return {
                    speaker: item?.speaker || item?.speakerName || undefined,
                    text: String(text).trim(),
                    start: item?.start ?? item?.startTime,
                    end: item?.end ?? item?.endTime
                }
            })
            .filter((segment) => segment.text.length > 0)
    }

    if (typeof transcript === 'object') {
        const obj = transcript as Record<string, unknown>
        if (Array.isArray(obj.segments)) {
            return toTranscriptSegments(obj.segments)
        }
        if (typeof obj.text === 'string') {
            return toTranscriptSegments(obj.text)
        }
    }

    return []
}

/** Renders segments back into readable "Speaker: text" lines. */
export function segmentsToText(segments: TranscriptSegment[]): string {
    return segments
        .map((segment) =>
            segment.speaker ? `${segment.speaker}: ${segment.text}` : segment.text
        )
        .join('\n')
}
