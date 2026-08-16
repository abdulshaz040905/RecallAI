interface AttendeeAvatarsProps {
    attendees: unknown
    getAttendeeList: (attendees: unknown) => string[]
    getInitials: (name: string) => string
}

/** Overlapping initials, hairline-ringed against whatever sits behind them. */
export default function AttendeeAvatars({
    attendees,
    getAttendeeList,
    getInitials
}: AttendeeAvatarsProps) {
    const attendeeList = getAttendeeList(attendees)

    return (
        <div className="flex -space-x-1.5">
            {attendeeList.slice(0, 4).map((attendee, index) => (
                <span
                    key={index}
                    title={attendee}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper-2 font-mono text-[9px] font-medium uppercase text-ink-soft"
                >
                    {getInitials(attendee)}
                </span>
            ))}

            {attendeeList.length > 4 && (
                <span
                    title={`${attendeeList.length - 4} more`}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-ink font-mono text-[9px] font-medium text-paper"
                >
                    +{attendeeList.length - 4}
                </span>
            )}
        </div>
    )
}
