'use client'

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TrelloCallback() {
    const router = useRouter()

    const [status, setStatus] = useState('Connecting your trello account ...')

    useEffect(() => {
        const processToken = async () => {

            try {
                const hash = window.location.hash.substring(1)
                const params = new URLSearchParams(hash)
                const token = params.get('token')

                if (!token) {
                    setStatus('no auth token found')
                    setTimeout(() => router.push('/integrations?error=no_token'), 2000)
                    return
                }

                setStatus('saving your connection...')

                const response = await fetch('/api/integrations/trello/process-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token })
                })

                if (response.ok) {
                    setStatus('Success! Redirecting...')
                    router.push('/integrations?success=trello_connected&setup=trello')
                } else {
                    setStatus('failed to sabe connection')
                    setTimeout(() => router.push('/integrations?error=save_failed'), 2000)
                }
            } catch {
                setStatus('an error occured')
                setTimeout(() => router.push('/integrations?error=save_failed'), 2000)
            }
        }
        processToken()
    }, [router])

    return (
        <div className="flex min-h-screen items-center justify-center bg-paper px-6">
            <div className="text-center">
                <p className="eyebrow mb-4">Trello</p>
                <h2 className="font-display text-[26px] font-medium tracking-[-0.035em]">
                    Connecting your account
                </h2>
                <p className="mt-2.5 flex items-center justify-center gap-2 text-[13px] text-ink-soft">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-vermilion" />
                    {status}
                </p>
            </div>
        </div>
    )
}