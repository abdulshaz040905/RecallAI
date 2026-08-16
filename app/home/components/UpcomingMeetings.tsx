import { CalendarEvent } from '../hooks/useMeetings'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'
import { SectionHeading } from '../../components/page-shell'

interface UpcomingMeetingsProps {
    upcomingEvents: CalendarEvent[]
    connected: boolean
    error: string
    loading: boolean
    initialLoading: boolean
    botToggles: { [key: string]: boolean }
    onRefresh: () => void
    onToggleBot: (eventId: string) => void
    onConnectCalendar: () => void
}

export default function UpcomingMeetings({
    upcomingEvents,
    connected,
    error,
    loading,
    initialLoading,
    botToggles,
    onRefresh,
    onToggleBot,
    onConnectCalendar
}: UpcomingMeetingsProps) {
    return (
        <div>
            <SectionHeading
                aside={
                    connected && !initialLoading ? (
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={loading}
                            className="link-underline cursor-pointer font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink disabled:opacity-40"
                        >
                            {loading ? 'Refreshing…' : 'Refresh'}
                        </button>
                    ) : (
                        <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                            {String(upcomingEvents.length).padStart(2, '0')}
                        </span>
                    )
                }
            >
                Upcoming
            </SectionHeading>

            {error && (
                <div className="mb-4 rounded-[10px] border border-destructive/25 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                    {error}
                </div>
            )}

            {initialLoading ? (
                <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-[92px] animate-pulse rounded-[10px] border border-line bg-paper-2"
                        />
                    ))}
                </div>
            ) : !connected ? (
                <div className="rounded-[var(--radius)] border border-dashed border-line-strong p-7 text-center">
                    <p className="font-display text-[16px] font-medium tracking-[-0.02em]">
                        Connect your calendar
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                        Recall needs Google Calendar to know which calls to join.
                    </p>
                    <Button
                        onClick={onConnectCalendar}
                        disabled={loading}
                        size="sm"
                        className="mt-5 w-full"
                    >
                        {loading ? 'Connecting…' : 'Connect Google Calendar'}
                    </Button>
                </div>
            ) : upcomingEvents.length === 0 ? (
                <div className="rounded-[var(--radius)] border border-dashed border-line-strong p-7 text-center">
                    <p className="font-display text-[16px] font-medium tracking-[-0.02em]">
                        Nothing scheduled
                    </p>
                    <p className="mt-2 text-[13px] text-ink-soft">Your calendar is clear.</p>
                </div>
            ) : (
                <ul>
                    {upcomingEvents.map((event) => {
                        const start = new Date(
                            event.start?.dateTime || event.start?.date || ''
                        )
                        const joinLink = event.hangoutLink || event.location

                        return (
                            <li
                                key={event.id}
                                className="group border-b border-line py-4 first:border-t"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-[14px] font-medium leading-snug tracking-[-0.01em]">
                                            {event.summary || 'Untitled meeting'}
                                        </p>
                                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                                            {format(start, 'EEE d MMM · HH:mm')}
                                            {event.attendees
                                                ? ` · ${event.attendees.length} attending`
                                                : ''}
                                        </p>
                                    </div>

                                    <Switch
                                        checked={!!botToggles[event.id]}
                                        onCheckedChange={() => onToggleBot(event.id)}
                                        aria-label="Toggle bot for this meeting"
                                        className="mt-0.5 shrink-0 cursor-pointer"
                                    />
                                </div>

                                {joinLink && (
                                    <a
                                        href={joinLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="link-underline mt-2.5 inline-block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink"
                                    >
                                        Join meeting →
                                    </a>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
