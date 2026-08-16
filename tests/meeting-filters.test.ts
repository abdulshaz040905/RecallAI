import { describe, expect, it } from 'vitest'
import {
    buildSearchQuery,
    computeDurationMinutes,
    normaliseParticipants,
    parseDateInput,
    parseSearchParams,
    resolveDatePreset,
    resolveDuration,
    resolveFilters
} from '@/lib/meeting-filters'

// Wednesday 2026-03-18, 14:30 local time.
const NOW = new Date(2026, 2, 18, 14, 30, 0)

describe('resolveDatePreset', () => {
    it('returns an open range for "all"', () => {
        expect(resolveDatePreset('all', NOW)).toEqual({ from: null, to: null })
    })

    it('bounds "today" to the current calendar day', () => {
        const { from, to } = resolveDatePreset('today', NOW)
        expect(from?.getDate()).toBe(18)
        expect(from?.getHours()).toBe(0)
        expect(to?.getDate()).toBe(18)
        expect(to?.getHours()).toBe(23)
    })

    it('bounds "yesterday" to the previous calendar day', () => {
        const { from, to } = resolveDatePreset('yesterday', NOW)
        expect(from?.getDate()).toBe(17)
        expect(to?.getDate()).toBe(17)
        expect(to?.getHours()).toBe(23)
    })

    it('makes "last_7_days" inclusive of today', () => {
        const { from, to } = resolveDatePreset('last_7_days', NOW)
        expect(from?.getDate()).toBe(12)
        expect(to?.getDate()).toBe(18)
    })

    it('treats "last_week" as the previous Mon–Sun, not a rolling 7 days', () => {
        const { from, to } = resolveDatePreset('last_week', NOW)
        // 2026-03-18 is a Wednesday, so last week is Mon 9th → Sun 15th.
        expect(from?.getDate()).toBe(9)
        expect(from?.getDay()).toBe(1)
        expect(to?.getDate()).toBe(15)
        expect(to?.getDay()).toBe(0)
    })

    it('bounds "this_month" from the 1st to now', () => {
        const { from, to } = resolveDatePreset('this_month', NOW)
        expect(from?.getDate()).toBe(1)
        expect(from?.getMonth()).toBe(2)
        expect(to?.getDate()).toBe(18)
    })

    it('bounds "last_month" to the whole previous month', () => {
        const { from, to } = resolveDatePreset('last_month', NOW)
        expect(from?.getMonth()).toBe(1)
        expect(from?.getDate()).toBe(1)
        expect(to?.getMonth()).toBe(1)
        expect(to?.getDate()).toBe(28) // 2026 is not a leap year
    })

    it('resolves "last_quarter" to Q4 of the previous year in January', () => {
        const january = new Date(2026, 0, 15)
        const { from, to } = resolveDatePreset('last_quarter', january)
        expect(from?.getFullYear()).toBe(2025)
        expect(from?.getMonth()).toBe(9) // October
        expect(to?.getFullYear()).toBe(2025)
        expect(to?.getMonth()).toBe(11) // December
        expect(to?.getDate()).toBe(31)
    })

    it('resolves "last_quarter" to Q1 when we are in Q2', () => {
        const may = new Date(2026, 4, 2)
        const { from, to } = resolveDatePreset('last_quarter', may)
        expect(from?.getMonth()).toBe(0)
        expect(to?.getMonth()).toBe(2)
        expect(to?.getDate()).toBe(31)
    })
})

describe('resolveDuration', () => {
    it('maps "less than 30 minutes" onto a max bound', () => {
        expect(resolveDuration('under_30')).toEqual({ min: undefined, max: 30 })
    })

    it('maps a banded preset onto both bounds', () => {
        expect(resolveDuration('30_to_60')).toEqual({ min: 30, max: 60 })
    })

    it('maps "over an hour" onto a min bound only', () => {
        expect(resolveDuration('over_60')).toEqual({ min: 60, max: undefined })
    })

    it('returns no bounds for "any"', () => {
        expect(resolveDuration('any')).toEqual({ min: undefined, max: undefined })
    })
})

describe('parseDateInput', () => {
    it('parses an ISO date', () => {
        expect(parseDateInput('2026-03-17')?.getFullYear()).toBe(2026)
    })

    it('returns null for junk and empty input', () => {
        expect(parseDateInput('not-a-date')).toBeNull()
        expect(parseDateInput('')).toBeNull()
        expect(parseDateInput(undefined)).toBeNull()
    })
})

describe('parseSearchParams', () => {
    it('applies safe defaults for an empty query string', () => {
        const params = parseSearchParams(new URLSearchParams())
        expect(params).toMatchObject({
            preset: 'all',
            duration: 'any',
            page: 1,
            pageSize: 20,
            sort: 'newest',
            participants: []
        })
    })

    it('reads every supported filter', () => {
        const params = parseSearchParams(
            new URLSearchParams(
                'q=budget&preset=custom&from=2026-03-17&to=2026-04-01&duration=under_30&participants=Ann,Bob&page=3&sort=longest'
            )
        )

        expect(params.query).toBe('budget')
        expect(params.preset).toBe('custom')
        expect(params.from).toBe('2026-03-17')
        expect(params.to).toBe('2026-04-01')
        expect(params.duration).toBe('under_30')
        expect(params.participants).toEqual(['Ann', 'Bob'])
        expect(params.page).toBe(3)
        expect(params.sort).toBe('longest')
    })

    it('clamps hostile pagination values', () => {
        const params = parseSearchParams(
            new URLSearchParams('page=-5&pageSize=100000')
        )
        expect(params.page).toBe(1)
        expect(params.pageSize).toBe(100)
    })

    it('falls back to newest for an unknown sort', () => {
        expect(parseSearchParams(new URLSearchParams('sort=drop-table')).sort).toBe(
            'newest'
        )
    })
})

describe('resolveFilters', () => {
    it('lets an explicit from/to override the preset', () => {
        const filters = resolveFilters(
            { preset: 'last_week', from: '2026-03-17', to: '2026-04-01' },
            NOW
        )

        expect(filters.from?.getDate()).toBe(17)
        expect(filters.from?.getMonth()).toBe(2)
        expect(filters.to?.getMonth()).toBe(3)
        expect(filters.to?.getDate()).toBe(1)
        // end of day, so nothing on April 1st is excluded
        expect(filters.to?.getHours()).toBe(23)
    })

    it('lets explicit minute bounds override the duration preset', () => {
        const filters = resolveFilters({ duration: 'under_30', minDuration: 5 }, NOW)
        expect(filters.minDuration).toBe(5)
        expect(filters.maxDuration).toBe(30)
    })

    it('computes skip/take from page and pageSize', () => {
        const filters = resolveFilters({ page: 4, pageSize: 25 }, NOW)
        expect(filters.skip).toBe(75)
        expect(filters.take).toBe(25)
    })

    it('maps sort onto a Prisma orderBy', () => {
        expect(resolveFilters({ sort: 'longest' }, NOW).orderBy).toEqual({
            durationMinutes: 'desc'
        })
        expect(resolveFilters({ sort: 'oldest' }, NOW).orderBy).toEqual({
            startTime: 'asc'
        })
    })
})

describe('buildSearchQuery', () => {
    it('omits defaults so URLs stay clean', () => {
        expect(buildSearchQuery({ preset: 'all', duration: 'any', page: 1 })).toBe('')
    })

    it('round-trips through parseSearchParams', () => {
        const original = {
            query: 'roadmap',
            preset: 'last_month' as const,
            duration: 'over_60' as const,
            participants: ['Ann', 'Bob'],
            page: 2,
            sort: 'oldest' as const
        }

        const parsed = parseSearchParams(new URLSearchParams(buildSearchQuery(original)))

        expect(parsed.query).toBe('roadmap')
        expect(parsed.preset).toBe('last_month')
        expect(parsed.duration).toBe('over_60')
        expect(parsed.participants).toEqual(['Ann', 'Bob'])
        expect(parsed.page).toBe(2)
        expect(parsed.sort).toBe('oldest')
    })
})

describe('computeDurationMinutes', () => {
    it('rounds to the nearest minute', () => {
        expect(
            computeDurationMinutes('2026-03-18T10:00:00Z', '2026-03-18T10:45:30Z')
        ).toBe(46)
    })

    it('never returns a negative duration', () => {
        expect(
            computeDurationMinutes('2026-03-18T11:00:00Z', '2026-03-18T10:00:00Z')
        ).toBe(0)
    })

    it('returns 0 for unparseable input', () => {
        expect(computeDurationMinutes('nope', 'also nope')).toBe(0)
    })
})

describe('normaliseParticipants', () => {
    it('handles an array of objects with emails', () => {
        expect(
            normaliseParticipants([{ email: 'ann@x.com' }, { name: 'Bob' }])
        ).toEqual(['ann@x.com', 'Bob'])
    })

    it('handles a JSON encoded array', () => {
        expect(normaliseParticipants('["Ann","Bob"]')).toEqual(['Ann', 'Bob'])
    })

    it('handles a comma separated string', () => {
        expect(normaliseParticipants('Ann, Bob , Cal')).toEqual(['Ann', 'Bob', 'Cal'])
    })

    it('returns an empty array for null/undefined', () => {
        expect(normaliseParticipants(null)).toEqual([])
        expect(normaliseParticipants(undefined)).toEqual([])
    })
})
