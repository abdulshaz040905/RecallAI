'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignOutButton, useAuth, useUser } from '@clerk/nextjs'
import { Bot, User } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PageBody, PageHeader, SectionHeading, Spinner } from '../components/page-shell'

const PLAN_LABELS: Record<string, string> = {
    free: 'Free plan',
    starter: 'Starter plan',
    pro: 'Pro plan',
    premium: 'Premium plan'
}

/** Label / value row, matching the spec tables used across the site. */
function Field({
    label,
    children
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line py-4 first:border-t">
            <span className="pt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                {label}
            </span>
            <div className="min-w-0 flex-1 text-right sm:max-w-[60%]">{children}</div>
        </div>
    )
}

export default function Settings() {
    const { user } = useUser()
    const { userId } = useAuth()
    const [botName, setBotName] = useState('Meeting Bot')
    const [botImageUrl, setBotImageUrl] = useState<string | null>(null)
    const [userPlan, setUserPlan] = useState('free')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    const fetchBotSettings = useCallback(async () => {
        try {
            const response = await fetch('/api/user/bot-settings')
            if (response.ok) {
                const data = await response.json()
                setBotName(data.botName || 'Meeting Bot')
                setBotImageUrl(data.botImageUrl || null)
                setUserPlan(data.plan || 'free')
            }
        } catch (error) {
            console.error('error fetching bot settings:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (userId) void fetchBotSettings()
    }, [userId, fetchBotSettings])

    const handleImageUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const response = await fetch('/api/upload/bot-avatar', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (response.ok) {
                setBotImageUrl(data.url)
                setHasChanges(true)
            } else {
                console.error('image upload failed:', data.error)
            }
        } catch (error) {
            console.error('image upload failed:', error)
        } finally {
            setIsUploading(false)
        }
    }

    const saveBotSettings = async () => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/user/bot-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botName, botImageUrl })
            })

            if (response.ok) setHasChanges(false)
        } catch (error) {
            console.error('error saving bot settings:', error)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner />
            </div>
        )
    }

    return (
        <>
            <PageHeader
                eyebrow="Account"
                title="Settings"
                description="Your profile, and how the bot presents itself in meetings."
                actions={
                    hasChanges ? (
                        <Button onClick={saveBotSettings} disabled={isSaving}>
                            {isSaving ? 'Saving…' : 'Save changes'}
                        </Button>
                    ) : undefined
                }
            />

            <PageBody className="max-w-[760px]">
                {/* Profile ------------------------------------------------- */}
                <section className="mb-12">
                    <SectionHeading
                        aside={
                            <span className="pill pill-info">
                                {PLAN_LABELS[userPlan.toLowerCase()] ?? 'Unknown plan'}
                            </span>
                        }
                    >
                        Profile
                    </SectionHeading>

                    <div className="mb-6 flex items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-paper-2">
                            {user?.imageUrl ? (
                                <Image
                                    src={user.imageUrl}
                                    alt=""
                                    width={56}
                                    height={56}
                                    className="h-14 w-14 object-cover"
                                />
                            ) : (
                                <User className="h-6 w-6 text-ink-faint" strokeWidth={1.5} />
                            )}
                        </span>
                        <div>
                            <p className="font-display text-[20px] font-medium tracking-[-0.03em]">
                                {user?.fullName || 'User'}
                            </p>
                            <p className="mt-0.5 text-[13px] text-ink-soft">
                                {user?.primaryEmailAddress?.emailAddress || 'No email'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Bot ----------------------------------------------------- */}
                <section className="mb-12">
                    <SectionHeading>Bot appearance</SectionHeading>

                    <Field label="Bot name">
                        <Input
                            id="bot-name"
                            type="text"
                            value={botName}
                            onChange={(e) => {
                                setBotName(e.target.value)
                                setHasChanges(true)
                            }}
                            placeholder="Meeting Bot"
                            className="text-right"
                        />
                    </Field>

                    <Field label="Avatar">
                        <div className="flex items-center justify-end gap-4">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-paper-2">
                                {botImageUrl ? (
                                    <Image
                                        src={botImageUrl}
                                        alt=""
                                        width={56}
                                        height={56}
                                        className="h-14 w-14 object-cover"
                                    />
                                ) : (
                                    <Bot className="h-6 w-6 text-ink-faint" strokeWidth={1.5} />
                                )}
                            </span>

                            <div className="text-right">
                                <input
                                    type="file"
                                    id="bot-image-upload"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={isUploading}
                                    className="hidden"
                                />
                                <Label
                                    htmlFor="bot-image-upload"
                                    className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-line-strong px-4 text-[13px] font-medium transition-colors hover:bg-ink hover:text-paper ${
                                        isUploading ? 'pointer-events-none opacity-50' : ''
                                    }`}
                                >
                                    {isUploading ? 'Uploading…' : 'Upload image'}
                                </Label>
                                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                                    JPG or PNG
                                </p>
                            </div>
                        </div>
                    </Field>
                </section>

                {/* Session ------------------------------------------------- */}
                <section>
                    <SectionHeading>Session</SectionHeading>
                    <SignOutButton>
                        <Button variant="outline">Sign out</Button>
                    </SignOutButton>
                </section>
            </PageBody>
        </>
    )
}
