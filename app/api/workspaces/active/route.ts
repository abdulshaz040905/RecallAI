import { prisma } from '@/lib/db'
import { getDbUser, getMembership } from '@/lib/workspace/service'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Switches the signed-in user's active workspace. */
export async function POST(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { workspaceId } = await request.json()
    const user = await getDbUser(userId)

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (workspaceId) {
        const membership = await getMembership(workspaceId, user.id)

        if (!membership) {
            return NextResponse.json(
                { error: 'You are not a member of that workspace' },
                { status: 403 }
            )
        }
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { activeWorkspaceId: workspaceId ?? null }
    })

    return NextResponse.json({ success: true, activeWorkspaceId: workspaceId ?? null })
}
