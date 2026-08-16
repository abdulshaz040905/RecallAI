import { GoogleGenAI } from '@google/genai'

/**
 * Central Gemini client.
 *
 * Model choices (verified against ai.google.dev, August 2026):
 *
 *  - chat / summarisation -> gemini-3.6-flash
 *    The current stable Flash model: balances speed and intelligence, and is
 *    cheaper than 3.5 Flash. Set GEMINI_CHAT_MODEL=gemini-3.5-flash-lite if you
 *    want the cheapest/fastest option and can accept slightly weaker summaries.
 *
 *  - embeddings -> gemini-embedding-001
 *    Returns 3072 dimensions by default. We request 768 via Matryoshka
 *    truncation (outputDimensionality) to keep the vector index small and cheap.
 *
 * NOTE ON DEPRECATED MODELS: gemini-2.0-flash was shut down in March 2026 and
 * text-embedding-004 was deprecated in January 2026. Do not set either via the
 * env overrides — requests will fail.
 *
 * IMPORTANT: your Pinecone index dimension must match EMBEDDING_DIMENSIONS.
 */

export const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash'
export const GEMINI_EMBEDDING_MODEL =
    process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'

/**
 * Dimension we ask gemini-embedding-001 to truncate to. 768 keeps the Pinecone
 * index 4x smaller than the 3072 default with very little retrieval quality
 * loss, thanks to Matryoshka Representation Learning.
 */
export const EMBEDDING_DIMENSIONS = Number(
    process.env.GEMINI_EMBEDDING_DIMENSIONS || 768
)

/** Gemini's embedContent caps out at 100 items per call. */
const EMBED_BATCH_SIZE = 100

let cachedClient: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY is not set. Add it to your .env file — get a free key at https://aistudio.google.com/apikey'
        )
    }

    if (!cachedClient) {
        cachedClient = new GoogleGenAI({ apiKey })
    }

    return cachedClient
}

/**
 * The Gemini free tier is rate limited per-minute. Instead of dropping a
 * request on the floor we retry transient failures (429 / 5xx) with
 * exponential backoff + jitter.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    { retries = 3, baseDelayMs = 700 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error

            const message = error instanceof Error ? error.message : String(error)
            const isRetryable =
                message.includes('429') ||
                message.includes('500') ||
                message.includes('502') ||
                message.includes('503') ||
                message.includes('504') ||
                message.toLowerCase().includes('overloaded') ||
                message.toLowerCase().includes('rate limit') ||
                message.toLowerCase().includes('unavailable') ||
                message.toLowerCase().includes('fetch failed')

            if (!isRetryable || attempt === retries) {
                throw error
            }

            const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 250
            await new Promise((resolve) => setTimeout(resolve, delay))
        }
    }

    throw lastError
}

/**
 * L2-normalise an embedding vector.
 *
 * gemini-embedding-001 only returns pre-normalised vectors at its full 3072
 * dimensions. Once truncated via outputDimensionality the vector is no longer
 * unit length, and cosine similarity in Pinecone silently degrades unless we
 * normalise ourselves. Exported for testing.
 */
export function normaliseVector(values: number[]): number[] {
    let sumOfSquares = 0

    for (const value of values) {
        sumOfSquares += value * value
    }

    const magnitude = Math.sqrt(sumOfSquares)

    if (magnitude === 0) {
        return values
    }

    return values.map((value) => value / magnitude)
}

/** Whether truncation means we need to normalise the returned vectors. */
function needsNormalising(): boolean {
    return (
        GEMINI_EMBEDDING_MODEL.startsWith('gemini-embedding-001') &&
        EMBEDDING_DIMENSIONS !== 3072
    )
}

async function embedBatch(texts: string[]): Promise<number[][]> {
    const response = await withRetry(() =>
        getClient().models.embedContent({
            model: GEMINI_EMBEDDING_MODEL,
            contents: texts,
            config: { outputDimensionality: EMBEDDING_DIMENSIONS }
        })
    )

    const embeddings = response.embeddings ?? []

    if (embeddings.length !== texts.length) {
        throw new Error(
            `Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs`
        )
    }

    return embeddings.map((embedding) => {
        const values = embedding.values ?? []
        return needsNormalising() ? normaliseVector(values) : values
    })
}

/** Embed a single piece of text. */
export async function createEmbedding(text: string): Promise<number[]> {
    const [embedding] = await embedBatch([text])
    return embedding
}

/**
 * Embed many texts at once, chunked so we never exceed Gemini's per-call limit.
 */
export async function createManyEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
        return []
    }

    const embeddings: number[][] = []

    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
        embeddings.push(...(await embedBatch(texts.slice(i, i + EMBED_BATCH_SIZE))))
    }

    return embeddings
}

/** Plain text chat completion. */
export async function chatWithAI(
    systemPrompt: string,
    userQuestion: string,
    options: { temperature?: number; maxOutputTokens?: number } = {}
): Promise<string> {
    const response = await withRetry(() =>
        getClient().models.generateContent({
            model: GEMINI_CHAT_MODEL,
            contents: userQuestion,
            config: {
                systemInstruction: systemPrompt,
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxOutputTokens ?? 800
            }
        })
    )

    return response.text || 'Sorry, I could not generate a response.'
}

/**
 * Gemini can be asked to return strict JSON via responseMimeType, which is far
 * more reliable than prompt-only JSON coercion. We still defensively strip
 * markdown fences in case a model version wraps the payload.
 */
export async function generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    options: { temperature?: number; maxOutputTokens?: number } = {}
): Promise<T> {
    const response = await withRetry(() =>
        getClient().models.generateContent({
            model: GEMINI_CHAT_MODEL,
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                temperature: options.temperature ?? 0.3,
                maxOutputTokens: options.maxOutputTokens ?? 2048,
                responseMimeType: 'application/json'
            }
        })
    )

    return parseJSONResponse<T>(response.text ?? '')
}

/** Exported for unit testing — tolerates ```json fences and stray prose. */
export function parseJSONResponse<T>(raw: string): T {
    const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .trim()

    try {
        return JSON.parse(cleaned) as T
    } catch {
        const firstBrace = cleaned.search(/[[{]/)
        const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))

        if (firstBrace !== -1 && lastBrace > firstBrace) {
            return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T
        }

        throw new Error('Gemini did not return valid JSON')
    }
}
