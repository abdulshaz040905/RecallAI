import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/billing/razorpay'
import { planIdFromRazorpay } from '@/lib/billing/plans'

/**
 * Razorpay subscription webhooks — the authoritative record of what a user is
 * paying for.
 *
 * Enable these events in the Razorpay dashboard (Settings → Webhooks):
 *   subscription.activated, subscription.charged, subscription.halted,
 *   subscription.cancelled, subscription.completed
 *
 * The raw body is read as text before parsing, because the HMAC is computed
 * over the exact bytes Razorpay sent — re-serialising the parsed JSON produces
 * a different string and the signature check fails.
 */

interface RazorpaySubscriptionEntity {
    id: string
    plan_id: string
    status: string
    notes?: Record<string, string>
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text()
        const headersList = await headers()
        const signature = headersList.get('x-razorpay-signature')

        if (!verifyWebhookSignature(rawBody, signature)) {
            console.warn('razorpay webhook: invalid signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
        }

        const event = JSON.parse(rawBody)
        const subscription: RazorpaySubscriptionEntity | undefined =
            event?.payload?.subscription?.entity

        if (!subscription) {
            // Payment-only events carry no subscription; nothing to reconcile.
            return NextResponse.json({ received: true })
        }

        switch (event.event) {
            case 'subscription.activated':
            case 'subscription.charged':
                await handleActive(subscription)
                break

            case 'subscription.halted':
            case 'subscription.pending':
                await handleStatus(subscription, 'past_due')
                break

            case 'subscription.cancelled':
            case 'subscription.completed':
            case 'subscription.expired':
                await handleCancelled(subscription)
                break

            default:
                console.log(`razorpay webhook: unhandled event ${event.event}`)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('razorpay webhook error:', error)
        return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
    }
}

/** Finds the user by subscription id, falling back to the notes we attached. */
async function findUser(subscription: RazorpaySubscriptionEntity) {
    const bySubscription = await prisma.user.findFirst({
        where: { razorpaySubscriptionId: subscription.id }
    })

    if (bySubscription) return bySubscription

    const clerkUserId = subscription.notes?.clerkUserId
    if (!clerkUserId) return null

    return prisma.user.findUnique({ where: { clerkId: clerkUserId } })
}

async function handleActive(subscription: RazorpaySubscriptionEntity) {
    const user = await findUser(subscription)
    if (!user) {
        console.warn('razorpay webhook: no user for subscription', subscription.id)
        return
    }

    const plan = planIdFromRazorpay(subscription.plan_id)
    if (!plan) {
        console.error('razorpay webhook: unrecognised plan', subscription.plan_id)
        return
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            currentPlan: plan,
            subscriptionStatus: 'active',
            razorpaySubscriptionId: subscription.id,
            // Each successful charge starts a fresh billing month, which is
            // what resets the meeting quota.
            billingPeriodStart: new Date(),
            meetingsThisMonth: 0
        }
    })
}

async function handleStatus(
    subscription: RazorpaySubscriptionEntity,
    status: string
) {
    const user = await findUser(subscription)
    if (!user) return

    await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: status }
    })
}

async function handleCancelled(subscription: RazorpaySubscriptionEntity) {
    const user = await findUser(subscription)
    if (!user) return

    await prisma.user.update({
        where: { id: user.id },
        data: {
            subscriptionStatus: 'cancelled',
            // Drop back to the free tier so limits apply again immediately.
            currentPlan: 'free'
        }
    })
}
