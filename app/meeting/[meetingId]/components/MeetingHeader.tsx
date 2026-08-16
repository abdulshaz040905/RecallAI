'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Check, Eye, Share2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface MeetingHeaderProps {
    title: string
    meetingId?: string
    summary?: string
    actionItems?: string
    isOwner: boolean
    isLoading?: boolean
}

export default function MeetingHeader({
    title,
    meetingId,
    summary,
    actionItems,
    isOwner,
    isLoading = false
}: MeetingHeaderProps) {
    const [isPosting, setIsPosting] = useState(false)
    const [copied, setCopied] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handlePostToSlack = async () => {
        if (!meetingId) return

        try {
            setIsPosting(true)
            toast('Posted to Slack')

            const response = await fetch('/api/slack/post-meeting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingId,
                    summary: summary || 'Meeting summary not available',
                    actionItems: actionItems || 'No action items recorded'
                })
            })

            await response.json()
        } catch {
            // Errors surface through the API response; nothing to do here.
        } finally {
            setIsPosting(false)
        }
    }

    const handleShare = async () => {
        if (!meetingId) return

        try {
            await navigator.clipboard.writeText(
                `${window.location.origin}/meeting/${meetingId}`
            )
            setCopied(true)
            toast('Meeting link copied')
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('failed to copy:', error)
        }
    }

    const handleDelete = async () => {
        if (!meetingId) return

        try {
            setIsDeleting(true)
            toast('Meeting deleted')

            const response = await fetch(`/api/meetings/${meetingId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            })
            await response.json()

            if (response.ok) router.push('/home')
        } catch (error) {
            console.error('delete error', error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/85 px-5 py-3.5 backdrop-blur-xl sm:px-8">
            <div className="min-w-0">
                <p className="eyebrow mb-1.5">Meeting</p>
                <h1 className="truncate font-display text-[17px] font-medium tracking-[-0.025em]">
                    {title}
                </h1>
            </div>

            {isLoading ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    Loading…
                </span>
            ) : isOwner ? (
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={handlePostToSlack}
                        disabled={isPosting || !meetingId}
                        variant="outline"
                        size="sm"
                    >
                        <Image src="/slack.png" alt="" width={14} height={14} />
                        {isPosting ? 'Posting…' : 'Post to Slack'}
                    </Button>

                    <Button onClick={handleShare} variant="outline" size="sm">
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5" strokeWidth={1.8} />
                                Copied
                            </>
                        ) : (
                            <>
                                <Share2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                                Share
                            </>
                        )}
                    </Button>

                    <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:border-destructive hover:bg-destructive hover:text-white"
                    >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            ) : (
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.6} />
                    Viewing shared meeting
                </span>
            )}
        </div>
    )
}
