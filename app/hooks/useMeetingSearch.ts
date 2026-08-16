'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    buildSearchQuery,
    type DatePreset,
    type DurationPreset,
    type MeetingSearchParams
} from '@/lib/meeting-filters'

export interface SearchedMeeting {
    id: string
    title: string
    description: string | null
    meetingUrl: string | null
    startTime: string
    endTime: string
    durationMinutes: number
    attendees: unknown
    participantNames: string[]
    transcriptReady: boolean
    recordingUrl: string | null
    summary: string | null
}

export interface ParticipantOption {
    name: string
    count: number
}

const DEFAULT_FILTERS: MeetingSearchParams = {
    query: '',
    preset: 'all',
    duration: 'any',
    participants: [],
    page: 1,
    pageSize: 20,
    sort: 'newest'
}

export function useMeetingSearch() {
    const [filters, setFilters] = useState<MeetingSearchParams>(DEFAULT_FILTERS)
    const [meetings, setMeetings] = useState<SearchedMeeting[]>([])
    const [participants, setParticipants] = useState<ParticipantOption[]>([])
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Abort in-flight requests so fast typing can't render stale results.
    const abortRef = useRef<AbortController | null>(null)

    const queryString = useMemo(() => buildSearchQuery(filters), [filters])

    const search = useCallback(async (qs: string) => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/meetings/search?${qs}`, {
                signal: controller.signal
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Search failed')
            }

            setMeetings(data.meetings ?? [])
            setTotal(data.total ?? 0)
            setTotalPages(data.totalPages ?? 1)
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return
            }
            setError(err instanceof Error ? err.message : 'Search failed')
            setMeetings([])
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false)
            }
        }
    }, [])

    // Debounce so each keystroke doesn't fire a query.
    useEffect(() => {
        const timeout = setTimeout(() => search(queryString), 280)
        return () => clearTimeout(timeout)
    }, [queryString, search])

    useEffect(() => {
        fetch('/api/meetings/participants')
            .then((response) => response.json())
            .then((data) => setParticipants(data.participants ?? []))
            .catch(() => setParticipants([]))
    }, [])

    // Any filter change resets pagination back to page one.
    const updateFilter = useCallback(
        <K extends keyof MeetingSearchParams>(key: K, value: MeetingSearchParams[K]) => {
            setFilters((previous) => ({
                ...previous,
                [key]: value,
                page: key === 'page' ? (value as number) : 1
            }))
        },
        []
    )

    const toggleParticipant = useCallback((name: string) => {
        setFilters((previous) => {
            const current = previous.participants ?? []
            const next = current.includes(name)
                ? current.filter((participant) => participant !== name)
                : [...current, name]

            return { ...previous, participants: next, page: 1 }
        })
    }, [])

    const reset = useCallback(() => setFilters(DEFAULT_FILTERS), [])

    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.query) count++
        if (filters.preset && filters.preset !== 'all') count++
        if (filters.from || filters.to) count++
        if (filters.duration && filters.duration !== 'any') count++
        count += filters.participants?.length ?? 0
        return count
    }, [filters])

    return {
        filters,
        meetings,
        participants,
        total,
        totalPages,
        loading,
        error,
        activeFilterCount,
        updateFilter,
        toggleParticipant,
        setDatePreset: (preset: DatePreset) => updateFilter('preset', preset),
        setDuration: (duration: DurationPreset) => updateFilter('duration', duration),
        reset,
        refetch: () => search(queryString)
    }
}
