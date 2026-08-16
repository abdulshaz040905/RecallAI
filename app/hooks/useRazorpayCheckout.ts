'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { PlanId } from '@/lib/billing/plans'

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

type RazorpayHandlerResponse = {
    razorpay_payment_id: string
    razorpay_subscription_id: string
    razorpay_signature: string
}

type RazorpayInstance = { open(): void; on(event: string, cb: (e: unknown) => void): void }

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
    }
}

/** Injects Razorpay's script once and resolves when it's ready. */
function loadCheckout(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve()
    if (window.Razorpay) return Promise.resolve()

    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${CHECKOUT_SRC}"]`
        )

        if (existing) {
            existing.addEventListener('load', () => resolve())
            existing.addEventListener('error', () => reject(new Error('load failed')))
            return
        }

        const script = document.createElement('script')
        script.src = CHECKOUT_SRC
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('load failed'))
        document.body.appendChild(script)
    })
}

/**
 * Opens Razorpay Checkout for a plan and confirms the result with our server.
 *
 * The checkout script is only fetched when someone actually clicks a plan, so
 * it costs nothing on first paint.
 */
export function useRazorpayCheckout() {
    const router = useRouter()
    const [pending, setPending] = useState<PlanId | null>(null)

    const checkout = useCallback(
        async (plan: PlanId) => {
            setPending(plan)

            try {
                const [subscriptionResponse] = await Promise.all([
                    fetch('/api/razorpay/create-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plan })
                    }),
                    loadCheckout()
                ])

                const data = await subscriptionResponse.json()

                if (!subscriptionResponse.ok) {
                    throw new Error(data.error || 'Could not start checkout')
                }

                if (!window.Razorpay) {
                    throw new Error('Checkout failed to load')
                }

                const instance = new window.Razorpay({
                    key: data.keyId,
                    subscription_id: data.subscriptionId,
                    name: 'Recall AI',
                    description: `${plan[0].toUpperCase()}${plan.slice(1)} plan · monthly`,
                    prefill: data.prefill,
                    theme: { color: '#121110' },
                    handler: async (response: RazorpayHandlerResponse) => {
                        try {
                            const verify = await fetch('/api/razorpay/verify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(response)
                            })

                            if (!verify.ok) throw new Error('Verification failed')

                            toast.success('You’re upgraded')
                            router.refresh()
                            router.push('/home')
                        } catch {
                            // The webhook will still settle this, so don't alarm
                            // the user — their payment did go through.
                            toast.message('Payment received', {
                                description: 'Your plan will update in a moment.'
                            })
                        } finally {
                            setPending(null)
                        }
                    },
                    modal: {
                        ondismiss: () => setPending(null)
                    }
                })

                instance.on('payment.failed', () => {
                    toast.error('Payment failed. Nothing was charged.')
                    setPending(null)
                })

                instance.open()
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : 'Could not start checkout'
                )
                setPending(null)
            }
        },
        [router]
    )

    return { checkout, pending }
}
