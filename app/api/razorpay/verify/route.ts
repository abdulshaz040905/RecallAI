import { prisma } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySubscriptionSignature } from '@/lib/billing/razorpay'
import { planIdFromRazorpay, type PlanId } from '@/lib/billing/plans'
import { razorpay } from '@/lib/billing/razorpay'

/**
 * Called by the browser the moment Checkout succeeds.
 *
 * This exists so the UI can update immediately rather than waiting on the
 * webhook — but it is *not* the source of truth. The signature is verified
 * here too, so a user cannot upgrade themselves by POSTing this endpoint, and
 * the webhook remains authoritative for renewals, failures and cancellations.
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const {
            razorpay_payment_id: paymentId,
            razorpay_subscription_id: subscriptionId,
            razorpay_signature: signature
        } = await request.json()

        if (!paymentId || !subscriptionId || !signature) {
            return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
        }

        const valid = verifySubscriptionSignature({
            razorpayPaymentId: paymentId,
            razorpaySubscriptionId: subscriptionId,
            razorpaySignature: signature
        })

        if (!valid) {
            console.warn('razorpay: bad signature on verify', { subscriptionId })
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // The subscription must belong to the caller — otherwise someone could
        // replay another user's valid signature against their own account.
        if (dbUser.razorpaySubscriptionId !== subscriptionId) {
            return NextResponse.json(
                { error: 'Subscription does not belong to this user' },
                { status: 403 }
            )
        }

        // Ask Razorpay which plan this actually is rather than trusting the
        // client's word for it.
        const subscription = await razorpay().subscriptions.fetch(subscriptionId)
        const plan = planIdFromRazorpay(subscription.plan_id as string)

        if (!plan) {
            console.error('razorpay: unrecognised plan', subscription.plan_id)
            return NextResponse.json({ error: 'Unknown plan' }, { status: 500 })
        }

        await activatePlan(dbUser.id, plan)

        return NextResponse.json({ ok: true, plan })
    } catch (error) {
        console.error('razorpay verify error:', error)
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
    }
}

async function activatePlan(dbUserId: string, plan: PlanId) {
    await prisma.user.update({
        where: { id: dbUserId },
        data: {
            currentPlan: plan,
            subscriptionStatus: 'active',
            billingPeriodStart: new Date(),
            meetingsThisMonth: 0,
            chatMessagesToday: 0
        }
    })
}
