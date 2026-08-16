import { prisma } from '@/lib/db'
import { assignableRoles, can, canManageMember, isRole, Role } from '@/lib/workspace/rbac'
import { countOwners, getDbUser, getMembership } from '@/lib/workspace/service'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function loadContext(workspaceId: string, memberId: string, clerkId: string) {
    const user = await getDbUser(clerkId)

    if (!user) {
        return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
    }

    const membership = await getMembership(workspaceId, user.id)

    const target = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId }
    })

    if (!target) {
        return { error: NextResponse.json({ error: 'Member not found' }, { status: 404 }) }
    }

    return { user, membership, target }
}

/** Change a member's role. */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { workspaceId, memberId } = await params
    const context = await loadContext(workspaceId, memberId, userId)

    if ('error' in context) {
        return context.error
    }

    const { membership, target } = context
    const { role } = await request.json()

    if (!isRole(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (!canManageMember(membership?.role, target.role as Role)) {
        return NextResponse.json(
            { error: 'You cannot change this member’s role' },
            { status: 403 }
        )
    }

    if (!assignableRoles(membership!.role).includes(role)) {
        return NextResponse.json(
            { error: `You cannot assign the ${role} role` },
            { status: 403 }
        )
    }

    const updated = await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { role }
    })

    return NextResponse.json({ success: true, member: updated })
}

/** Remove a member, or leave the workspace yourself. */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { workspaceId, memberId } = await params
    const context = await loadContext(workspaceId, memberId, userId)

    if ('error' in context) {
        return context.error
    }

    const { user, membership, target } = context
    const isSelf = target.userId === user.id

    if (!isSelf && !can(membership?.role, 'member:remove')) {
        return NextResponse.json(
            { error: 'You do not have permission to remove members' },
            { status: 403 }
        )
    }

    if (!isSelf && !canManageMember(membership?.role, target.role as Role)) {
        return NextResponse.json({ error: 'You cannot remove this member' }, { status: 403 })
    }

    // A workspace must always retain at least one owner.
    if (target.role === 'OWNER' && (await countOwners(workspaceId)) <= 1) {
        return NextResponse.json(
            {
                error:
                    'This is the only owner. Promote someone else to owner before leaving.'
            },
            { status: 409 }
        )
    }

    await prisma.$transaction([
        prisma.workspaceMember.delete({ where: { id: memberId } }),
        prisma.user.updateMany({
            where: { id: target.userId, activeWorkspaceId: workspaceId },
            data: { activeWorkspaceId: null }
        })
    ])

    return NextResponse.json({ success: true })
}
