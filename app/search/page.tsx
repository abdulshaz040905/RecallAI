'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Search as SearchIcon, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useMeetingSearch } from '../hooks/useMeetingSearch'
import MeetingFilters from './components/MeetingFilters'
import { EmptyState, PageBody, PageHeader } from '../components/page-shell'

function formatDuration(minutes: number): string {
    if (!minutes) return '—'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest ? `${hours}h ${rest}m` : `${hours}h`
}

/** Wraps the matched substring so users can see why a result matched. */
function Highlight({ text, term }: { text: string; term?: string }) {
    if (!term || !text) return <>{text}</>

    const index = text.toLowerCase().indexOf(term.toLowerCase())
    if (index === -1) return <>{text}</>

    return (
        <>
            {text.slice(0, index)}
            <mark className="bg-vermilion/20 px-0.5 text-ink">
                {text.slice(index, index + term.length)}
            </mark>
            {text.slice(index + term.length)}
        </>
    )
}

export default function SearchPage() {
    const router = useRouter()
    const [showFilters, setShowFilters] = useState(false)

    const {
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
        setDatePreset,
        setDuration,
        reset
    } = useMeetingSearch()

    const page = filters.page ?? 1

    return (
        <>
            <PageHeader
                eyebrow="Archive"
                title="Search meetings"
                description="Every transcript, summary and title. Narrow it down by date, length or who was in the room."
            />

            <PageBody>
                <div className="mb-8 flex gap-2">
                    <div className="relative flex-1">
                        <SearchIcon
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                            strokeWidth={1.6}
                        />
                        <Input
                            value={filters.query ?? ''}
                            onChange={(event) => updateFilter('query', event.target.value)}
                            placeholder="Search transcripts, summaries and titles…"
                            className="h-12 pl-11 text-[14px]"
                        />
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => setShowFilters((value) => !value)}
                        className="h-12 lg:hidden"
                    >
                        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.6} />
                        {activeFilterCount > 0 && (
                            <span className="ml-1 font-mono text-[11px] tabular-nums">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                </div>

                <div className="flex gap-10">
                    {/* Filters rail */}
                    <aside
                        className={cn(
                            'w-56 shrink-0',
                            showFilters ? 'block' : 'hidden lg:block'
                        )}
                    >
                        <div className="sticky top-32">
                            <MeetingFilters
                                filters={filters}
                                participants={participants}
                                activeFilterCount={activeFilterCount}
                                onDatePreset={setDatePreset}
                                onDuration={setDuration}
                                onChange={updateFilter}
                                onToggleParticipant={toggleParticipant}
                                onReset={reset}
                            />
                        </div>
                    </aside>

                    {/* Results */}
                    <div className="min-w-0 flex-1">
                        <div className="mb-4 flex items-center justify-between border-b border-line pb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                            <span>
                                {loading
                                    ? 'Searching…'
                                    : `${total} meeting${total === 1 ? '' : 's'}`}
                            </span>
                            {totalPages > 1 && (
                                <span className="tabular-nums">
                                    {page} / {totalPages}
                                </span>
                            )}
                        </div>

                        {error && (
                            <div className="mb-4 rounded-[10px] border border-destructive/25 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="space-y-2">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="h-24 animate-pulse rounded-[10px] border border-line bg-paper-2"
                                    />
                                ))}
                            </div>
                        ) : meetings.length === 0 ? (
                            <EmptyState
                                title="No meetings match"
                                description="Try a broader date range, a different term, or clear your filters."
                                action={
                                    activeFilterCount > 0 ? (
                                        <Button variant="outline" onClick={reset}>
                                            Clear filters
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <ul>
                                {meetings.map((meeting, i) => (
                                    <li
                                        key={meeting.id}
                                        className="border-b border-line first:border-t"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/meeting/${meeting.id}`)}
                                            className="group flex w-full cursor-pointer gap-5 py-5 text-left transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:pl-2"
                                        >
                                            <span className="w-6 shrink-0 pt-1 font-mono text-[10px] tabular-nums text-ink-faint">
                                                {String((page - 1) * 10 + i + 1).padStart(2, '0')}
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                                    <span className="font-display text-[17px] font-medium leading-snug tracking-[-0.025em]">
                                                        <Highlight
                                                            text={meeting.title}
                                                            term={filters.query}
                                                        />
                                                    </span>
                                                    {meeting.transcriptReady && (
                                                        <span className="pill pill-success">
                                                            Transcript
                                                        </span>
                                                    )}
                                                </span>

                                                {meeting.summary && (
                                                    <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-ink-soft">
                                                        <Highlight
                                                            text={meeting.summary}
                                                            term={filters.query}
                                                        />
                                                    </span>
                                                )}

                                                <span className="mt-3 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                                                    {format(new Date(meeting.startTime), 'EEE d MMM yyyy · HH:mm')}
                                                    {' · '}
                                                    {formatDuration(meeting.durationMinutes)}
                                                    {meeting.participantNames?.length > 0 && (
                                                        <>
                                                            {' · '}
                                                            {meeting.participantNames.slice(0, 3).join(', ')}
                                                            {meeting.participantNames.length > 3 &&
                                                                ` +${meeting.participantNames.length - 3}`}
                                                        </>
                                                    )}
                                                </span>
                                            </span>

                                            <span className="shrink-0 self-center pl-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                                Open →
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => updateFilter('page', page - 1)}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Previous
                                </Button>

                                <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                                    {page} / {totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => updateFilter('page', page + 1)}
                                >
                                    Next
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </PageBody>
        </>
    )
}
