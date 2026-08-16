import { describe, expect, it } from 'vitest'
import {
    batchSegments,
    MAX_SEGMENTS_PER_REQUEST,
    segmentsToText,
    toTranscriptSegments
} from '@/lib/translation'
import {
    DEFAULT_LANGUAGE,
    getLanguage,
    getLanguageName,
    isRTL,
    isSupportedLanguage,
    LANGUAGES,
    searchLanguages
} from '@/lib/languages'

describe('language catalogue', () => {
    it('ships more than 100 languages', () => {
        expect(LANGUAGES.length).toBeGreaterThan(100)
    })

    it('has no duplicate codes', () => {
        const codes = LANGUAGES.map((language) => language.code)
        expect(new Set(codes).size).toBe(codes.length)
    })

    it('gives every language a name and a native name', () => {
        for (const language of LANGUAGES) {
            expect(language.name.length).toBeGreaterThan(0)
            expect(language.nativeName.length).toBeGreaterThan(0)
            expect(language.code.length).toBeGreaterThan(0)
        }
    })

    it('defaults to English', () => {
        expect(DEFAULT_LANGUAGE).toBe('en')
        expect(isSupportedLanguage(DEFAULT_LANGUAGE)).toBe(true)
    })

    it('validates codes case-insensitively', () => {
        expect(isSupportedLanguage('ES')).toBe(true)
        expect(isSupportedLanguage('zh-CN')).toBe(true)
        expect(isSupportedLanguage('klingon')).toBe(false)
    })

    it('flags right-to-left languages', () => {
        expect(isRTL('ar')).toBe(true)
        expect(isRTL('he')).toBe(true)
        expect(isRTL('ur')).toBe(true)
        expect(isRTL('en')).toBe(false)
    })

    it('resolves display names', () => {
        expect(getLanguageName('hi')).toBe('Hindi')
        expect(getLanguage('ja')?.nativeName).toBe('日本語')
        // Unknown codes fall back to the raw code rather than throwing.
        expect(getLanguageName('xx')).toBe('xx')
    })
})

describe('searchLanguages', () => {
    it('returns everything for an empty term', () => {
        expect(searchLanguages('  ').length).toBe(LANGUAGES.length)
    })

    it('matches English names', () => {
        expect(searchLanguages('span').some((l) => l.code === 'es')).toBe(true)
    })

    it('matches native names', () => {
        expect(searchLanguages('हिन्दी').some((l) => l.code === 'hi')).toBe(true)
    })

    it('matches codes', () => {
        expect(searchLanguages('pt').some((l) => l.code === 'pt')).toBe(true)
    })

    it('returns nothing for gibberish', () => {
        expect(searchLanguages('zzzzqqq')).toEqual([])
    })
})

describe('batchSegments', () => {
    it('keeps a small transcript in one batch', () => {
        const batches = batchSegments(['a', 'b', 'c'])
        expect(batches).toEqual([['a', 'b', 'c']])
    })

    it('splits on the segment count limit', () => {
        const segments = Array.from({ length: 300 }, (_, i) => `line ${i}`)
        const batches = batchSegments(segments)

        expect(batches.length).toBe(3)
        expect(batches[0].length).toBe(MAX_SEGMENTS_PER_REQUEST)
        expect(batches.flat().length).toBe(300)
    })

    it('splits on the character limit even when under the count limit', () => {
        const long = 'x'.repeat(10_000)
        const batches = batchSegments([long, long, long, long], 128, 28_000)

        expect(batches.length).toBe(2)
        expect(batches[0].length).toBe(2)
        expect(batches.flat().length).toBe(4)
    })

    it('never drops or reorders segments', () => {
        const segments = Array.from({ length: 57 }, (_, i) => `s${i}`)
        expect(batchSegments(segments, 10).flat()).toEqual(segments)
    })

    it('handles an empty input', () => {
        expect(batchSegments([])).toEqual([])
    })

    it('keeps an oversized single segment rather than losing it', () => {
        const huge = 'y'.repeat(50_000)
        expect(batchSegments([huge], 128, 28_000)).toEqual([[huge]])
    })
})

describe('toTranscriptSegments', () => {
    it('parses the MeetingBaaS word-array shape', () => {
        const segments = toTranscriptSegments([
            {
                speaker: 'Ann',
                words: [{ word: 'Hello' }, { word: 'team' }],
                start: 0,
                end: 2
            }
        ])

        expect(segments).toEqual([
            { speaker: 'Ann', text: 'Hello team', start: 0, end: 2 }
        ])
    })

    it('parses "Speaker: text" plain text', () => {
        const segments = toTranscriptSegments('Ann: Hello\nBob: Hi there')
        expect(segments).toEqual([
            { speaker: 'Ann', text: 'Hello' },
            { speaker: 'Bob', text: 'Hi there' }
        ])
    })

    it('handles lines with no speaker prefix', () => {
        expect(toTranscriptSegments('just a line')).toEqual([{ text: 'just a line' }])
    })

    it('unwraps a { segments: [...] } object', () => {
        const segments = toTranscriptSegments({
            segments: [{ speaker: 'Ann', text: 'Hi' }]
        })
        expect(segments[0].speaker).toBe('Ann')
    })

    it('returns an empty array for null/empty input', () => {
        expect(toTranscriptSegments(null)).toEqual([])
        expect(toTranscriptSegments('')).toEqual([])
        expect(toTranscriptSegments({})).toEqual([])
    })

    it('drops empty segments', () => {
        const segments = toTranscriptSegments([
            { speaker: 'Ann', words: [] },
            { speaker: 'Bob', words: [{ word: 'Hi' }] }
        ])
        expect(segments.length).toBe(1)
    })
})

describe('segmentsToText', () => {
    it('renders speaker attribution back out', () => {
        expect(
            segmentsToText([
                { speaker: 'Ann', text: 'Hello' },
                { speaker: 'Bob', text: 'Hi' }
            ])
        ).toBe('Ann: Hello\nBob: Hi')
    })

    it('omits the prefix when there is no speaker', () => {
        expect(segmentsToText([{ text: 'Hello' }])).toBe('Hello')
    })

    it('round-trips through toTranscriptSegments', () => {
        const original = 'Ann: Hello team\nBob: Sounds good'
        expect(segmentsToText(toTranscriptSegments(original))).toBe(original)
    })
})
