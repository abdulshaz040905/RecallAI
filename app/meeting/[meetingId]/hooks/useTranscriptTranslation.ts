'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DEFAULT_LANGUAGE, getLanguageName } from '@/lib/languages'

export interface TranslatedSegment {
    speaker?: string
    text: string
    start?: number
    end?: number
}

/**
 * Fetches and caches transcript translations for a meeting.
 *
 * Results are memoised per language in component state so flipping back to a
 * language you already viewed is instant, and the server also caches to the
 * TranscriptTranslation table so it never pays Google twice.
 */
export function useTranscriptTranslation(meetingId: string) {
    const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
    const [loading, setLoading] = useState(false)
    const [cache, setCache] = useState<Record<string, TranslatedSegment[]>>({})
    const [summaryCache, setSummaryCache] = useState<Record<string, string | null>>({})
    const [availableLanguages, setAvailableLanguages] = useState<string[]>([])

    useEffect(() => {
        if (!meetingId) return

        fetch(`/api/meetings/${meetingId}/translate`)
            .then((response) => response.json())
            .then((data) => {
                setAvailableLanguages(
                    (data.available ?? []).map((entry: { language: string }) => entry.language)
                )
            })
            .catch(() => setAvailableLanguages([]))
    }, [meetingId])

    const changeLanguage = useCallback(
        async (nextLanguage: string) => {
            if (nextLanguage === language) {
                return
            }

            // Original language and anything already fetched render instantly.
            if (nextLanguage === DEFAULT_LANGUAGE || cache[nextLanguage]) {
                setLanguage(nextLanguage)
                return
            }

            setLoading(true)

            try {
                const response = await fetch(`/api/meetings/${meetingId}/translate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: nextLanguage })
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Translation failed')
                }

                setCache((previous) => ({
                    ...previous,
                    [nextLanguage]: (data.segments ?? []) as TranslatedSegment[]
                }))
                setSummaryCache((previous) => ({
                    ...previous,
                    [nextLanguage]: data.summary ?? null
                }))
                setAvailableLanguages((previous) =>
                    previous.includes(nextLanguage) ? previous : [...previous, nextLanguage]
                )
                setLanguage(nextLanguage)

                if (!data.cached) {
                    toast.success(`Translated to ${getLanguageName(nextLanguage)}`)
                }
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : 'Could not translate transcript'
                )
            } finally {
                setLoading(false)
            }
        },
        [language, cache, meetingId]
    )

    return {
        language,
        loading,
        availableLanguages,
        translatedSegments: cache[language] ?? null,
        translatedSummary: summaryCache[language] ?? null,
        isOriginal: language === DEFAULT_LANGUAGE,
        changeLanguage
    }
}
