import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'not authed' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: {
                clerkId: userId
            },
            select: {
                currentPlan: true,
                subscriptionStatus: true,
                meetingsThisMonth: true,
                chatMessagesToday: true,
                billingPeriodStart: true,
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        return NextResponse.json(user)
    } catch (error) {
        console.error('[usage] failed to fetch usage:', error)
        return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }
}