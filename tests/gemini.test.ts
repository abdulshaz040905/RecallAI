import { describe, expect, it, vi } from 'vitest'
import {
    EMBEDDING_DIMENSIONS,
    GEMINI_CHAT_MODEL,
    GEMINI_EMBEDDING_MODEL,
    normaliseVector,
    parseJSONResponse,
    withRetry
} from '@/lib/gemini'
import { transcriptToText } from '@/lib/ai-processor'

const RETIRED_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'text-embedding-004',
    'embedding-001',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
]

describe('gemini configuration', () => {
    it('defaults to a current stable chat model', () => {
        expect(GEMINI_CHAT_MODEL).toBe('gemini-3.6-flash')
    })

    it('defaults to a current stable embedding model', () => {
        expect(GEMINI_EMBEDDING_MODEL).toBe('gemini-embedding-001')
    })

    it('never defaults to a retired model', () => {
        // gemini-2.0-flash was shut down in March 2026 and text-embedding-004
        // was deprecated in January 2026 — both fail at request time.
        expect(RETIRED_MODELS).not.toContain(GEMINI_CHAT_MODEL)
        expect(RETIRED_MODELS).not.toContain(GEMINI_EMBEDDING_MODEL)
    })

    it('declares 768 dimensions so Pinecone stays in sync', () => {
        expect(EMBEDDING_DIMENSIONS).toBe(768)
    })
})

describe('normaliseVector', () => {
    it('returns a unit-length vector', () => {
        const result = normaliseVector([3, 4])
        expect(result[0]).toBeCloseTo(0.6, 10)
        expect(result[1]).toBeCloseTo(0.8, 10)

        const magnitude = Math.hypot(...result)
        expect(magnitude).toBeCloseTo(1, 10)
    })

    it('preserves direction', () => {
        const original = [1, -2, 3]
        const result = normaliseVector(original)

        // Every component keeps its sign and relative ratio.
        expect(Math.sign(result[0])).toBe(1)
        expect(Math.sign(result[1])).toBe(-1)
        expect(result[2] / result[0]).toBeCloseTo(3, 10)
    })

    it('leaves an already-normalised vector effectively unchanged', () => {
        const unit = [1, 0, 0]
        expect(normaliseVector(unit)).toEqual([1, 0, 0])
    })

    it('does not divide by zero on an all-zero vector', () => {
        expect(normaliseVector([0, 0, 0])).toEqual([0, 0, 0])
    })

    it('handles a realistic 768-dimension vector', () => {
        const vector = Array.from({ length: 768 }, (_, i) => Math.sin(i))
        const magnitude = Math.hypot(...normaliseVector(vector))
        expect(magnitude).toBeCloseTo(1, 10)
    })
})

describe('parseJSONResponse', () => {
    it('parses clean JSON', () => {
        expect(parseJSONResponse<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
    })

    it('strips ```json fences', () => {
        expect(parseJSONResponse('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    })

    it('strips bare ``` fences', () => {
        expect(parseJSONResponse('```\n{"a":1}\n```')).toEqual({ a: 1 })
    })

    it('recovers JSON wrapped in prose', () => {
        expect(
            parseJSONResponse('Sure! Here you go: {"summary":"hi"} Hope that helps.')
        ).toEqual({ summary: 'hi' })
    })

    it('parses top-level arrays', () => {
        expect(parseJSONResponse<number[]>('[1,2,3]')).toEqual([1, 2, 3])
    })

    it('throws a clear error on unrecoverable output', () => {
        expect(() => parseJSONResponse('not json at all')).toThrow(
            /did not return valid JSON/
        )
    })
})

describe('withRetry', () => {
    it('returns immediately on success', async () => {
        const fn = vi.fn().mockResolvedValue('ok')
        await expect(withRetry(fn)).resolves.toBe('ok')
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries rate limit errors and eventually succeeds', async () => {
        const fn = vi
            .fn()
            .mockRejectedValueOnce(new Error('429 Too Many Requests'))
            .mockResolvedValue('recovered')

        await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).resolves.toBe(
            'recovered'
        )
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it('does not retry a non-retryable error', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('400 Bad Request'))

        await expect(withRetry(fn, { retries: 3, baseDelayMs: 1 })).rejects.toThrow(
            '400'
        )
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('gives up after the retry budget', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('503 overloaded'))

        await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toThrow(
            '503'
        )
        expect(fn).toHaveBeenCalledTimes(3)
    })
})

describe('transcriptToText', () => {
    it('flattens the word-array shape with speakers', () => {
        expect(
            transcriptToText([
                { speaker: 'Ann', words: [{ word: 'Hello' }, { word: 'world' }] }
            ])
        ).toBe('Ann: Hello world')
    })

    it('passes a plain string straight through', () => {
        expect(transcriptToText('already text')).toBe('already text')
    })

    it('reads a { text } object', () => {
        expect(transcriptToText({ text: 'body' })).toBe('body')
    })

    it('recurses into { segments }', () => {
        expect(transcriptToText({ segments: [{ speaker: 'Bob', text: 'Hi' }] })).toBe(
            'Bob: Hi'
        )
    })

    it('returns an empty string for null/undefined', () => {
        expect(transcriptToText(null)).toBe('')
        expect(transcriptToText(undefined)).toBe('')
    })
})
