import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { razorpay } from '@/lib/billing/razorpay'
import { serverPlanId, type PlanId } from '@/lib/billing/plans'

const VALID_PLANS: PlanId[] = ['starter', 'pro', 'premium']

const PLAN_LEVEL: Record<PlanId, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    premium: 3
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        const { plan } = await request.json() as { plan: PlanId }

        if (!VALID_PLANS.includes(plan)) {
            return NextResponse.json(
                { error: 'Invalid plan' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId }
        })

        if (!user?.razorpaySubscriptionId) {
            return NextResponse.json(
                { error: 'No active subscription found' },
                { status: 400 }
            )
        }

        const currentPlan = user.currentPlan as PlanId

        if (currentPlan === plan) {
            return NextResponse.json(
                { error: 'This is already your current plan' },
                { status: 409 }
            )
        }

        const razorpayPlanId = serverPlanId(plan)

        if (!razorpayPlanId) {
            return NextResponse.json(
                { error: 'Razorpay plan is not configured' },
                { status: 500 }
            )
        }

        const isUpgrade = PLAN_LEVEL[plan] > PLAN_LEVEL[currentPlan]
        const scheduleChangeAt = isUpgrade ? 'now' : 'cycle_end'

        const currentSubscription =
            await razorpay().subscriptions.fetch(
                user.razorpaySubscriptionId
            )

        await razorpay().subscriptions.update(
            user.razorpaySubscriptionId,
            {
                plan_id: razorpayPlanId,
                schedule_change_at: scheduleChangeAt,
                customer_notify: 1
            } as any
        )

        if (isUpgrade) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    currentPlan: plan,
                    pendingPlan: null,
                    planChangeEffectiveAt: null,
                    billingPeriodStart: new Date(),
                    meetingsThisMonth: 0
                }
            })
        } else {
            const currentEnd = Number(
                (currentSubscription as any).current_end
            )

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    pendingPlan: plan,
                    planChangeEffectiveAt: currentEnd
                        ? new Date(currentEnd * 1000)
                        : null
                }
            })
        }

        return NextResponse.json({
            success: true,
            changeType: isUpgrade ? 'immediate' : 'cycle_end',
            plan
        })
    } catch (error) {
        console.error('Plan change failed:', error)

        return NextResponse.json(
            { error: 'Could not change plan' },
            { status: 500 }
        )
    }
}