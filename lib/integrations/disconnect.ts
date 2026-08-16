import { prisma } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Shared disconnect handler. Deleting the row is idempotent — a missing record
 * is treated as "already disconnected" rather than an error.
 */
export async function disconnectIntegration(platform: string) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    try {
        await prisma.userIntegration.deleteMany({
            where: { userId, platform }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(`[${platform}] disconnect failed:`, error)
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }
}
