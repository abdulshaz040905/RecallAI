import { generateJSON } from './gemini'
import { getLanguageName, isSupportedLanguage } from './languages'

/**
 * Transcript translation, backed by Gemini.
 *
 * Replaces the Google Cloud Translation API, which needs billing enabled on a
 * GCP project. Gemini has a free tier and the key is already in `.env` for
 * summaries, chat and embeddings — so this adds no new account, dependency or
 * env var.
 *
 * The public surface is unchanged from the Cloud Translation version, so the
 * translate route, the `TranscriptTranslation` cache table, the language
 * selector and the existing unit tests all keep working untouched.
 *
 * Trade-off worth knowing: an LLM is not a dedicated MT engine. Quality is
 * good — often better on conversational speech, because it sees whole segments
 * in context rather than isolated strings — but it is slower per call and can
 * occasionally return the wrong number of items. That last risk is handled
 * explicitly below rather than trusted.
 */

/** Google's old per-request limits. Kept exported: the unit tests assert them. */
export const MAX_SEGMENTS_PER_REQUEST = 128
export const MAX_CHARS_PER_REQUEST = 28_000

/**
 * Gemini works best on smaller batches than Cloud Translation did. Asking for
 * 128 segments in one JSON array invites dropped entries; ~40 keeps each round
 * trip well inside the output token budget and makes a retry cheap.
 */
const GEMINI_SEGMENTS_PER_REQUEST = 40
const GEMINI_CHARS_PER_REQUEST = 4_000

export class TranslationError extends Error {
    constructor(
        message: string,
        public readonly status?: number
    ) {
        super(message)
        this.name = 'TranslationError'
    }
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

const TRANSLATE_SYSTEM_PROMPT = `You are a professional translator working on meeting transcripts.

You receive a JSON array of strings. Translate each one and return a JSON array
of the translated strings.

Rules — follow all of them:
- Return EXACTLY the same number of items, in EXACTLY the same order.
- Translate the meaning, not word for word. This is spoken conversation, so keep
  it natural in the target language.
- Preserve proper nouns, product names, acronyms and numbers as they are.
- Do NOT add, merge, split, summarise, explain or annotate anything.
- If an item is already in the target language, return it unchanged.
- Return only the JSON array. No prose, no markdown fences.`

/** Translates an array of strings, preserving order and array length. */
export async function translateSegments(
    segments: string[],
    targetLanguage: string,
    sourceLanguage?: string
): Promise<TranslateResult> {
    if (!isSupportedLanguage(targetLanguage)) {
        throw new TranslationError(`Unsupported target language: ${targetLanguage}`)
    }

    // Keep placeholders for blanks so indexes line up on the way back.
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

    const targetName = getLanguageName(targetLanguage)
    const sourceName = sourceLanguage ? getLanguageName(sourceLanguage) : null

    const batches = batchSegments(
        payloadSegments,
        GEMINI_SEGMENTS_PER_REQUEST,
        GEMINI_CHARS_PER_REQUEST
    )

    const translated: string[] = []
    let characterCount = 0

    for (const batch of batches) {
        const instruction = [
            `Target language: ${targetName} (${targetLanguage}).`,
            sourceName ? `Source language: ${sourceName}.` : null,
            `Items: ${batch.length}. Return exactly ${batch.length}.`,
            '',
            JSON.stringify(batch)
        ]
            .filter(Boolean)
            .join('\n')

        let result: unknown

        try {
            result = await generateJSON<unknown>(TRANSLATE_SYSTEM_PROMPT, instruction, {
                temperature: 0,
                maxOutputTokens: 8192
            })
        } catch (error) {
            throw new TranslationError(
                error instanceof Error ? error.message : 'Translation request failed'
            )
        }

        // Gemini is asked for a bare array, but tolerate {translations: [...]}.
        const items = Array.isArray(result)
            ? result
            : Array.isArray((result as { translations?: unknown })?.translations)
              ? (result as { translations: unknown[] }).translations
              : null

        if (!items) {
            throw new TranslationError('Translation response was not a JSON array')
        }

        // A short or long array would silently shift every later segment onto the
        // wrong speaker, so pad or trim against the batch we actually sent.
        for (let i = 0; i < batch.length; i++) {
            const value = items[i]
            translated.push(typeof value === 'string' && value.length > 0 ? value : batch[i])
        }

        characterCount += batch.reduce((sum, text) => sum + text.length, 0)
    }

    const output = [...segments]
    nonEmptyIndexes.forEach((originalIndex, i) => {
        output[originalIndex] = translated[i] ?? segments[originalIndex]
    })

    return {
        translations: output,
        detectedSourceLanguage: sourceLanguage,
        characterCount
    }
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

const DETECT_SYSTEM_PROMPT = `Identify the language of the text you are given.

Reply with JSON only: {"language":"<BCP-47 code>"}

Use the shortest correct code — "en", "hi", "es", "pt-BR", "zh-CN". If you
cannot tell, reply {"language":null}.`

export async function detectLanguage(text: string): Promise<string | null> {
    if (!text || text.trim().length === 0) {
        return null
    }

    try {
        const result = await generateJSON<{ language?: string | null }>(
            DETECT_SYSTEM_PROMPT,
            text.slice(0, 2000),
            { temperature: 0, maxOutputTokens: 32 }
        )

        const code = result?.language

        return typeof code === 'string' && code.trim().length > 0 ? code.trim() : null
    } catch {
        // Detection is advisory — the caller falls back to translating anyway.
        return null
    }
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