'use client'

import { SignUpButton, useUser } from '@clerk/nextjs'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PAID_PLANS, formatInr } from '@/lib/billing/plans'
import { useRazorpayCheckout } from '../hooks/useRazorpayCheckout'

/**
 * The plan grid, shared by the landing page section and the /pricing route so
 * the two can never drift apart.
 *
 * Signed-out visitors get a sign-up modal instead of Checkout — there is no
 * point opening Razorpay for someone we can't attach a subscription to.
 */
export function PricingPlans() {
    const { isSignedIn } = useUser()
    const { checkout, pending } = useRazorpayCheckout()

    return (
        <div className="grid border-t border-line lg:grid-cols-3">
            {PAID_PLANS.map((plan, i) => (
                <div
                    key={plan.id}
                    className={`relative flex flex-col border-b border-line py-10 lg:border-b-0 ${
                        i > 0 ? 'lg:border-l lg:pl-10' : ''
                    } ${i < PAID_PLANS.length - 1 ? 'lg:pr-10' : ''}`}
                >
                    <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-display text-[22px] font-medium tracking-[-0.03em]">
                            {plan.name}
                        </h3>
                        {plan.popular && <span className="pill pill-warn">Most popular</span>}
                    </div>

                    <p className="mt-2 text-[13px] text-ink-soft">{plan.description}</p>

                    <p className="mt-8 flex items-baseline gap-1.5">
                        <span className="display text-[clamp(3rem,6vw,4.25rem)] tabular-nums">
                            {formatInr(plan.amount)}
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                            / month
                        </span>
                    </p>

                    <ul className="mt-8 flex-1 space-y-3">
                        {plan.features.map((feature) => (
                            <li key={feature} className="flex gap-2.5">
                                <Check
                                    className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink"
                                    strokeWidth={2}
                                />
                                <span className="text-[13.5px] leading-snug text-ink-soft">
                                    {feature}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {isSignedIn ? (
                        <Button
                            variant={plan.popular ? 'default' : 'outline'}
                            onClick={() => checkout(plan.id)}
                            disabled={pending !== null}
                            className="mt-10 w-full"
                            size="lg"
                        >
                            {pending === plan.id ? 'Opening checkout…' : `Choose ${plan.name}`}
                        </Button>
                    ) : (
                        <SignUpButton mode="modal">
                            <Button
                                variant={plan.popular ? 'default' : 'outline'}
                                className="mt-10 w-full"
                                size="lg"
                            >
                                Choose {plan.name}
                            </Button>
                        </SignUpButton>
                    )}
                </div>
            ))}
        </div>
    )
}
