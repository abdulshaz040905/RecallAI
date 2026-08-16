/**
 * Pure helpers for the past-meetings search & filter UI.
 *
 * Everything in this file is side-effect free so it can be unit tested without
 * a database, and reused on both the client (to build query strings) and the
 * server (to build Prisma `where` clauses).
 */

export type DatePreset =
    | 'all'
    | 'today'
    | 'yesterday'
    | 'last_7_days'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'last_quarter'
    | 'this_year'
    | 'custom'

export type DurationPreset =
    | 'any'
    | 'under_15'
    | 'under_30'
    | '30_to_60'
    | 'over_60'
    | 'over_120'

export interface MeetingSearchParams {
    query?: string
    preset?: DatePreset
    from?: string
    to?: string
    duration?: DurationPreset
    minDuration?: number
    maxDuration?: number
    participants?: string[]
    page?: number
    pageSize?: number
    sort?: 'newest' | 'oldest' | 'longest' | 'shortest'
}

export interface DateRange {
    from: Date | null
    to: Date | null
}

export const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
    { value: 'all', label: 'All time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_week', label: 'Last week' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_quarter', label: 'Last quarter' },
    { value: 'this_year', label: 'This year' },
    { value: 'custom', label: 'Custom range' }
]

export const DURATION_PRESETS: Array<{
    value: DurationPreset
    label: string
    min?: number
    max?: number
}> = [
    { value: 'any', label: 'Any length' },
    { value: 'under_15', label: 'Under 15 min', max: 15 },
    { value: 'under_30', label: 'Under 30 min', max: 30 },
    { value: '30_to_60', label: '30–60 min', min: 30, max: 60 },
    { value: 'over_60', label: 'Over 1 hour', min: 60 },
    { value: 'over_120', label: 'Over 2 hours', min: 120 }
]

function startOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function endOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

/**
 * Resolves a named preset into a concrete date range.
 *
 * "last_week" means the previous calendar week (Mon–Sun), which is different
 * from "last_7_days" — users ask for both and mean different things.
 */
export function resolveDatePreset(
    preset: DatePreset,
    now: Date = new Date()
): DateRange {
    switch (preset) {
        case 'today':
            return { from: startOfDay(now), to: endOfDay(now) }

        case 'yesterday': {
            const yesterday = addDays(now, -1)
            return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
        }

        case 'last_7_days':
            return { from: startOfDay(addDays(now, -6)), to: endOfDay(now) }

        case 'last_week': {
            // ISO weeks: Monday = start.
            const dayOfWeek = (now.getDay() + 6) % 7
            const thisMonday = startOfDay(addDays(now, -dayOfWeek))
            const lastMonday = addDays(thisMonday, -7)
            return { from: lastMonday, to: endOfDay(addDays(thisMonday, -1)) }
        }

        case 'this_month':
            return {
                from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
                to: endOfDay(now)
            }

        case 'last_month': {
            const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
            return {
                from: startOfDay(firstOfLastMonth),
                to: endOfDay(lastOfLastMonth)
            }
        }

        case 'last_quarter': {
            const currentQuarter = Math.floor(now.getMonth() / 3)
            const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear()
            const quarter = currentQuarter === 0 ? 3 : currentQuarter - 1
            const from = new Date(year, quarter * 3, 1)
            const to = new Date(year, quarter * 3 + 3, 0)
            return { from: startOfDay(from), to: endOfDay(to) }
        }

        case 'this_year':
            return {
                from: startOfDay(new Date(now.getFullYear(), 0, 1)),
                to: endOfDay(now)
            }

        case 'all':
        case 'custom':
        default:
            return { from: null, to: null }
    }
}

/** Turns a duration preset into explicit minute bounds. */
export function resolveDuration(preset: DurationPreset): {
    min?: number
    max?: number
} {
    const found = DURATION_PRESETS.find((p) => p.value === preset)
    if (!found) {
        return {}
    }
    return { min: found.min, max: found.max }
}

/** Parses "2026-03-17" / ISO strings safely; returns null on garbage input. */
export function parseDateInput(value?: string | null): Date | null {
    if (!value) {
        return null
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Reads and validates the query string of a search request. */
export function parseSearchParams(searchParams: URLSearchParams): MeetingSearchParams {
    const rawPage = Number(searchParams.get('page') ?? '1')
    const rawPageSize = Number(searchParams.get('pageSize') ?? '20')

    const participants = (searchParams.get('participants') || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)

    const sort = searchParams.get('sort')

    return {
        query: searchParams.get('q')?.trim() || undefined,
        preset: (searchParams.get('preset') as DatePreset) || 'all',
        from: searchParams.get('from') || undefined,
        to: searchParams.get('to') || undefined,
        duration: (searchParams.get('duration') as DurationPreset) || 'any',
        minDuration: searchParams.get('minDuration')
            ? Number(searchParams.get('minDuration'))
            : undefined,
        maxDuration: searchParams.get('maxDuration')
            ? Number(searchParams.get('maxDuration'))
            : undefined,
        participants,
        page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
        pageSize:
            Number.isFinite(rawPageSize) && rawPageSize > 0
                ? Math.min(Math.floor(rawPageSize), 100)
                : 20,
        sort:
            sort === 'oldest' || sort === 'longest' || sort === 'shortest'
                ? sort
                : 'newest'
    }
}

/** Serialises filters back into a query string for the client. */
export function buildSearchQuery(params: MeetingSearchParams): string {
    const search = new URLSearchParams()

    if (params.query) search.set('q', params.query)
    if (params.preset && params.preset !== 'all') search.set('preset', params.preset)
    if (params.from) search.set('from', params.from)
    if (params.to) search.set('to', params.to)
    if (params.duration && params.duration !== 'any') search.set('duration', params.duration)
    if (params.minDuration != null) search.set('minDuration', String(params.minDuration))
    if (params.maxDuration != null) search.set('maxDuration', String(params.maxDuration))
    if (params.participants?.length) {
        search.set('participants', params.participants.join(','))
    }
    if (params.page && params.page > 1) search.set('page', String(params.page))
    if (params.pageSize && params.pageSize !== 20) {
        search.set('pageSize', String(params.pageSize))
    }
    if (params.sort && params.sort !== 'newest') search.set('sort', params.sort)

    return search.toString()
}

export interface ResolvedFilters {
    from: Date | null
    to: Date | null
    minDuration?: number
    maxDuration?: number
    query?: string
    participants: string[]
    skip: number
    take: number
    orderBy: Record<string, 'asc' | 'desc'>
}

/**
 * Collapses raw params into the concrete values the database query needs.
 * Explicit from/to always win over the preset so a custom range works even if
 * the preset field was left set to something else.
 */
export function resolveFilters(
    params: MeetingSearchParams,
    now: Date = new Date()
): ResolvedFilters {
    const presetRange = resolveDatePreset(params.preset ?? 'all', now)
    const explicitFrom = parseDateInput(params.from)
    const explicitTo = parseDateInput(params.to)

    const from = explicitFrom ? startOfDay(explicitFrom) : presetRange.from
    const to = explicitTo ? endOfDay(explicitTo) : presetRange.to

    const durationBounds = resolveDuration(params.duration ?? 'any')
    const minDuration = params.minDuration ?? durationBounds.min
    const maxDuration = params.maxDuration ?? durationBounds.max

    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20

    const orderBy: Record<string, 'asc' | 'desc'> =
        params.sort === 'oldest'
            ? { startTime: 'asc' }
            : params.sort === 'longest'
              ? { durationMinutes: 'desc' }
              : params.sort === 'shortest'
                ? { durationMinutes: 'asc' }
                : { startTime: 'desc' }

    return {
        from,
        to,
        minDuration,
        maxDuration,
        query: params.query,
        participants: params.participants ?? [],
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy
    }
}

/** Minutes between two timestamps, rounded and never negative. */
export function computeDurationMinutes(start: Date | string, end: Date | string): number {
    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return 0
    }

    return Math.max(0, Math.round((endMs - startMs) / 60000))
}

/** Normalises the many shapes `Meeting.attendees` can hold into a name list. */
export function normaliseParticipants(attendees: unknown): string[] {
    if (!attendees) {
        return []
    }

    if (Array.isArray(attendees)) {
        return attendees
            .map((entry: any) =>
                typeof entry === 'string' ? entry : entry?.email || entry?.name || ''
            )
            .map((value: string) => value.trim())
            .filter(Boolean)
    }

    if (typeof attendees === 'string') {
        const trimmed = attendees.trim()

        if (trimmed.startsWith('[')) {
            try {
                return normaliseParticipants(JSON.parse(trimmed))
            } catch {
                // fall through to comma splitting
            }
        }

        return trimmed
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
    }

    return []
}
