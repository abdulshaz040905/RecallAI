'use client'

import { format } from 'date-fns'
import { PastMeeting } from '../hooks/useMeetings'
import AttendeeAvatars from './AttendeeAvatars'
import { EmptyState } from '../../components/page-shell'

interface PastMeetingsProps {
    pastMeetings: PastMeeting[]
    pastLoading: boolean
    onMeetingClick: (id: string) => void
    getAttendeeList: (attendees: unknown) => string[]
    getInitials: (name: string) => string
}

function durationLabel(start: Date | string, end: Date | string) {
    const minutes = Math.max(
        0,
        Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
    )

    if (!minutes) return null
    if (minutes < 60) return `${minutes}m`

    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export default function PastMeetings({
    pastMeetings,
    pastLoading,
    onMeetingClick,
    getAttendeeList,
    getInitials
}: PastMeetingsProps) {
    if (pastLoading) {
        return (
            <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-[104px] animate-pulse rounded-[10px] border border-line bg-paper-2"
                    />
                ))}
            </div>
        )
    }

    if (pastMeetings.length === 0) {
        return (
            <EmptyState
                title="No past meetings yet"
                description="Once the bot sits in on a call, the recording, transcript and summary show up right here."
            />
        )
    }

    return (
        <ul>
            {pastMeetings.map((meeting, i) => {
                const duration = durationLabel(meeting.startTime, meeting.endTime)

                return (
                    <li key={meeting.id} className="border-b border-line first:border-t">
                        <button
                            type="button"
                            onClick={() => onMeetingClick(meeting.id)}
                            className="group flex w-full cursor-pointer gap-5 py-5 text-left transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:group-hover:pl-2 sm:hover:pl-2"
                        >
                            <span className="w-6 shrink-0 pt-1 font-mono text-[10px] tabular-nums text-ink-faint">
                                {String(i + 1).padStart(2, '0')}
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                    <span className="truncate font-display text-[17px] font-medium tracking-[-0.025em]">
                                        {meeting.title}
                                    </span>
                                    {meeting.transcriptReady && (
                                        <span className="pill pill-info">Transcript</span>
                                    )}
                                </span>

                                {meeting.description && (
                                    <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-ink-soft">
                                        {meeting.description}
                                    </span>
                                )}

                                <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                                        {format(new Date(meeting.startTime), 'EEE d MMM · HH:mm')}
                                        {duration && ` · ${duration}`}
                                    </span>
                                    {meeting.attendees ? (
                                        <AttendeeAvatars
                                            attendees={meeting.attendees}
                                            getAttendeeList={getAttendeeList}
                                            getInitials={getInitials}
                                        />
                                    ) : null}
                                </span>
                            </span>

                            <span className="shrink-0 self-center pl-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                Open →
                            </span>
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}
