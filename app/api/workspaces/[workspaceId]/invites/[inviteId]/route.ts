import { prisma } from '@/lib/db'
import { can } from '@/lib/workspace/rbac'
import { getDbUser, getMembership } from '@/lib/workspace/service'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Revokes a pending invite. */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string; inviteId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { workspaceId, inviteId } = await params
    const user = await getDbUser(userId)
    const membership = user ? await getMembership(workspaceId, user.id) : null

    if (!can(membership?.role, 'member:invite')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.workspaceInvite.updateMany({
        where: { id: inviteId, workspaceId, status: 'PENDING' },
        data: { status: 'REVOKED' }
    })

    return NextResponse.json({ success: true })
}
