'use client'

import { useUser } from '@clerk/nextjs'
import Image from 'next/image'

interface MeetingData {
    title: string
    date: string
    time: string
    userName: string
}

export default function MeetingInfo({ meetingData }: { meetingData: MeetingData }) {
    const { user } = useUser()

    return (
        <div className="mb-10 border-b border-line pb-8">
            <h2 className="font-display text-[clamp(1.9rem,4vw,2.75rem)] font-medium leading-[1.05] tracking-[-0.04em]">
                {meetingData.title}
            </h2>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-paper-2">
                        {user?.imageUrl ? (
                            <Image
                                src={user.imageUrl}
                                alt=""
                                width={20}
                                height={20}
                                className="h-5 w-5 object-cover"
                            />
                        ) : (
                            <span className="text-[9px] font-medium text-ink-soft">
                                {meetingData.userName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </span>
                    {meetingData.userName}
                </span>

                <span>{meetingData.date}</span>
                <span>{meetingData.time}</span>
            </div>
        </div>
    )
}
