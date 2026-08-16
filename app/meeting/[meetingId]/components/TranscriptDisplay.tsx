'use client'

import { useMemo, useState } from 'react'
import { Copy, Download, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { isRTL, getLanguageName } from '@/lib/languages'
import LanguageSelector from './LanguageSelector'
import type { TranslatedSegment } from '../hooks/useTranscriptTranslation'

interface TranscriptWord {
    word: string
    start: number
    end: number
}

interface TranscriptSegment {
    words: TranscriptWord[]
    offset: number
    speaker: string
}

interface TranscriptDisplayProps {
    transcript: TranscriptSegment[]
    /** Translation controls are optional so the component still works standalone. */
    language?: string
    onLanguageChange?: (code: string) => void
    translating?: boolean
    translatedSegments?: TranslatedSegment[] | null
    availableLanguages?: string[]
}

function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export default function TranscriptDisplay({
    transcript,
    language = 'en',
    onLanguageChange,
    translating = false,
    translatedSegments = null,
    availableLanguages = []
}: TranscriptDisplayProps) {
    const [term, setTerm] = useState('')

    // Normalise the original transcript and the translated one into one shape.
    const rows = useMemo(() => {
        if (translatedSegments && translatedSegments.length > 0) {
            return translatedSegments.map((segment, index) => ({
                key: `t-${index}`,
                speaker: segment.speaker || 'Speaker',
                text: segment.text,
                time:
                    segment.start != null
                        ? `${formatTime(segment.start)}${
                              segment.end != null ? `–${formatTime(segment.end)}` : ''
                          }`
                        : null
            }))
        }

        return (transcript ?? []).map((segment, index) => ({
            key: `o-${index}`,
            speaker: segment.speaker || 'Speaker',
            text: segment.words.map((word) => word.word).join(' '),
            time: `${formatTime(segment.offset)}–${formatTime(
                segment.words[segment.words.length - 1]?.end ?? segment.offset
            )}`
        }))
    }, [transcript, translatedSegments])

    const filtered = useMemo(() => {
        if (!term.trim()) return rows
        const needle = term.toLowerCase()
        return rows.filter(
            (row) =>
                row.text.toLowerCase().includes(needle) ||
                row.speaker.toLowerCase().includes(needle)
        )
    }, [rows, term])

    const plainText = useMemo(
        () => rows.map((row) => `${row.speaker}: ${row.text}`).join('\n\n'),
        [rows]
    )

    const rtl = isRTL(language)

    if (!transcript || transcript.length === 0) {
        return (
            <div className="rounded-[var(--radius)] border border-dashed border-line-strong px-8 py-14 text-center">
                <p className="text-[14px] text-ink-soft">No transcript available yet.</p>
            </div>
        )
    }

    return (
        <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                    <h3 className="eyebrow">Transcript</h3>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                        {rows.length} segment{rows.length === 1 ? '' : 's'}
                        {language !== 'en' && ` · ${getLanguageName(language)}`}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {onLanguageChange && (
                        <LanguageSelector
                            value={language}
                            onChange={onLanguageChange}
                            loading={translating}
                            cachedLanguages={availableLanguages}
                        />
                    )}

                    <Button
                        size="sm"
                        variant="outline"
                        aria-label="Copy transcript"
                        onClick={() => {
                            navigator.clipboard.writeText(plainText)
                            toast.success('Transcript copied')
                        }}
                    >
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.6} />
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        aria-label="Download transcript"
                        onClick={() => {
                            const blob = new Blob([plainText], { type: 'text/plain' })
                            const url = URL.createObjectURL(blob)
                            const anchor = document.createElement('a')
                            anchor.href = url
                            anchor.download = `transcript-${language}.txt`
                            anchor.click()
                            URL.revokeObjectURL(url)
                        }}
                    >
                        <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
                    </Button>
                </div>
            </div>

            <div className="relative mb-6">
                <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
                    strokeWidth={1.6}
                />
                <Input
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Find in transcript…"
                    className="h-10 pl-10 text-[13px]"
                />
            </div>

            <div dir={rtl ? 'rtl' : 'ltr'} className="max-h-[30rem] overflow-y-auto pr-2">
                {filtered.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-ink-faint">
                        Nothing matches “{term}”.
                    </p>
                ) : (
                    filtered.map((row) => (
                        <div
                            key={row.key}
                            className="flex gap-5 border-b border-line py-4 last:border-0"
                        >
                            <div className="w-24 shrink-0">
                                <p className="text-[12px] font-medium leading-snug">
                                    {row.speaker}
                                </p>
                                {row.time && (
                                    <p className="mt-1 font-mono text-[10px] tabular-nums text-ink-faint">
                                        {row.time}
                                    </p>
                                )}
                            </div>
                            <p className="flex-1 text-[14px] leading-[1.7] text-ink-soft">
                                {row.text}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
