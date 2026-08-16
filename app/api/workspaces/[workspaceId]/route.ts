import { prisma } from '@/lib/db'
import { assignableRoles, can } from '@/lib/workspace/rbac'
import { getDbUser, getMembership } from '@/lib/workspace/service'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { workspaceId } = await params
    const user = await getDbUser(userId)

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const membership = await getMembership(workspaceId, user.id)

    if (!membership || !can(membership.role, 'workspace:view')) {
        return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
    }

    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
            members: {
                orderBy: { joinedAt: 'asc' },
                include: {
                    user: { select: { id: true, name: true, email: true, imageUrl: true } }
                }
            },
            invites: {
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'desc' }
            },
            _count: { select: { meetings: true } }
        }
    })

    if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    return NextResponse.json({
        workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            about: workspace.about,
            logo: workspace.logo,
            createdAt: workspace.createdAt,
            meetingCount: workspace._count.meetings
        },
        members: workspace.members.map((member) => ({
            id: member.id,
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            name: member.user.name,
            email: member.user.email,
            imageUrl: member.user.imageUrl
        })),
        invites: can(membership.role, 'member:invite') ? workspace.invites : [],
        viewer: {
            role: membership.role,
            assignableRoles: assignableRoles(membership.role),
            permissions: {
                canUpdate: can(membership.role, 'workspace:update'),
                canDelete: can(membership.role, 'workspace:delete'),
                canInvite: can(membership.role, 'member:invite'),
                canRemoveMembers: can(membership.role, 'member:remove'),
                canChangeRoles: can(membership.role, 'member:change_role'),
                canManageIntegrations: can(membership.role, 'integration:manage')
            }
        }
    })
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { workspaceId } = await params
    const user = await getDbUser(userId)

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const membership = await getMembership(workspaceId, user.id)

    if (!can(membership?.role, 'workspace:update')) {
        return NextResponse.json(
            { error: 'You do not have permission to update this workspace' },
            { status: 403 }
        )
    }

    const { name, about, logo } = await request.json()

    const workspace = await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
            ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
            ...(typeof about === 'string' ? { about: about.trim() || null } : {}),
            ...(typeof logo === 'string' ? { logo: logo || null } : {})
        }
    })

    return NextResponse.json({ success: true, workspace })
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { workspaceId } = await params
    const user = await getDbUser(userId)

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const membership = await getMembership(workspaceId, user.id)

    if (!can(membership?.role, 'workspace:delete')) {
        return NextResponse.json(
            { error: 'Only the workspace owner can delete it' },
            { status: 403 }
        )
    }

    // Guard against removing the last owner's workspace by accident is not
    // needed here, but we do detach meetings rather than cascading them away.
    await prisma.$transaction([
        prisma.meeting.updateMany({
            where: { workspaceId },
            data: { workspaceId: null }
        }),
        prisma.workspace.delete({ where: { id: workspaceId } }),
        prisma.user.updateMany({
            where: { activeWorkspaceId: workspaceId },
            data: { activeWorkspaceId: null }
        })
    ])

    return NextResponse.json({ success: true })
}
