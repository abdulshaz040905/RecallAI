'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type State =
    | { status: 'loading' }
    | { status: 'success'; workspaceName: string; workspaceId: string }
    | { status: 'error'; message: string }

function JoinWorkspaceInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isLoaded, isSignedIn } = useAuth()
    const token = searchParams.get('token')

    const [state, setState] = useState<State>({ status: 'loading' })

    useEffect(() => {
        if (!isLoaded) {
            return
        }

        if (!isSignedIn) {
            // Bounce through sign-in and come back to this exact link.
            router.push(`/sign-in?redirect_url=/workspaces/join?token=${token ?? ''}`)
            return
        }

        if (!token) {
            setState({ status: 'error', message: 'This invite link is missing its token.' })
            return
        }

        let cancelled = false

        const accept = async () => {
            try {
                const response = await fetch('/api/workspaces/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                })

                const payload = await response.json()

                if (cancelled) return

                if (!response.ok) {
                    setState({
                        status: 'error',
                        message: payload.error || 'Could not accept this invite.'
                    })
                    return
                }

                setState({
                    status: 'success',
                    workspaceName: payload.workspace?.name ?? 'the workspace',
                    workspaceId: payload.workspace?.id
                })
            } catch {
                if (!cancelled) {
                    setState({ status: 'error', message: 'Something went wrong. Try again.' })
                }
            }
        }

        accept()

        return () => {
            cancelled = true
        }
    }, [isLoaded, isSignedIn, token, router])

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md rounded-[var(--radius)] border border-line bg-card p-9 text-center">
                {state.status === 'loading' && (
                    <>
                        <p className="eyebrow mb-4">Invite</p>
                        <h1 className="font-display text-[22px] font-medium tracking-[-0.03em]">
                            Accepting your invite…
                        </h1>
                        <p className="mt-2 text-[13px] text-ink-soft">
                            Hang tight, this only takes a second.
                        </p>
                    </>
                )}

                {state.status === 'success' && (
                    <>
                        <p className="eyebrow mb-4">You&apos;re in</p>
                        <h1 className="font-display text-[22px] font-medium leading-tight tracking-[-0.03em]">
                            Welcome to {state.workspaceName}
                        </h1>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
                            You can now see the workspace&apos;s meetings, transcripts and
                            summaries.
                        </p>
                        <div className="mt-7 flex justify-center gap-2">
                            <Button
                                onClick={() => router.push(`/workspaces/${state.workspaceId}`)}
                            >
                                Open workspace
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/home')}>
                                Go to dashboard
                            </Button>
                        </div>
                    </>
                )}

                {state.status === 'error' && (
                    <>
                        <p className="eyebrow mb-4 text-vermilion">Not accepted</p>
                        <h1 className="font-display text-[22px] font-medium tracking-[-0.03em]">
                            Invite not accepted
                        </h1>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
                            {state.message}
                        </p>
                        <Button
                            onClick={() => router.push('/workspaces')}
                            className="mt-7"
                        >
                            Go to workspaces
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}

export default function JoinWorkspacePage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
                </div>
            }
        >
            <JoinWorkspaceInner />
        </Suspense>
    )
}
