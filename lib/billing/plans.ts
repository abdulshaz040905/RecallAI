/**
 * The single source of truth for what we sell.
 *
 * Prices are in paise (₹1 = 100 paise) because that is what Razorpay's API
 * speaks — but note these amounts are display-only. What actually gets charged
 * is the Plan you create in the Razorpay dashboard (Subscriptions → Plans),
 * whose id lives in `.env`. Keep the two in sync.
 *
 * Plan ids are deliberately server-only: the browser sends a plan *name*
 * ("pro") and the server decides what that costs, so a tampered request can't
 * buy the premium tier at the starter price.
 */

export type PlanId = 'free' | 'starter' | 'pro' | 'premium'

export interface Plan {
    id: PlanId
    name: string
    /** Monthly price in paise. */
    amount: number
    description: string
    features: string[]
    popular: boolean
}

/** ₹ display string for an amount in paise. */
export function formatInr(paise: number): string {
    return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export const PAID_PLANS: Plan[] = [
    {
        id: 'starter',
        name: 'Starter',
        amount: 9900,
        description: 'For getting started.',
        features: [
            '10 meetings per month',
            '30 AI chat messages per day',
            'Transcripts and summaries',
            'Action item extraction',
            'Email notifications'
        ],
        popular: false
    },
    {
        id: 'pro',
        name: 'Pro',
        amount: 19900,
        description: 'For teams who live in meetings.',
        features: [
            '30 meetings per month',
            '100 AI chat messages per day',
            'Transcripts and summaries',
            'Action item extraction',
            'Email notifications',
            'Priority support'
        ],
        popular: true
    },
    {
        id: 'premium',
        name: 'Premium',
        amount: 29900,
        description: 'No limits, at all.',
        features: [
            'Unlimited meetings',
            'Unlimited AI chat messages',
            'Transcripts and summaries',
            'Action item extraction',
            'Email notifications',
            'Priority support'
        ],
        popular: false
    }
]

export function getPlan(id: string): Plan | undefined {
    return PAID_PLANS.find((plan) => plan.id === id)
}

/** Server-side plan id lookup. Never runs in the browser. */
export function serverPlanId(id: PlanId): string | undefined {
    const map: Record<string, string | undefined> = {
        starter: process.env.RAZORPAY_STARTER_PLAN_ID,
        pro: process.env.RAZORPAY_PRO_PLAN_ID,
        premium: process.env.RAZORPAY_PREMIUM_PLAN_ID
    }

    return map[id]
}

/** Reverse lookup used by the webhook to turn a Razorpay plan id into ours. */
export function planIdFromRazorpay(razorpayPlanId: string): PlanId | null {
    for (const id of ['starter', 'pro', 'premium'] as const) {
        if (serverPlanId(id) === razorpayPlanId) return id
    }
    return null
}
