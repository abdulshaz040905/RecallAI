import { prisma } from '@/lib/db'
import { sendWorkspaceInviteEmail } from '@/lib/email-service-free'
import { assignableRoles, can, isRole } from '@/lib/workspace/rbac'
import {
    createInviteToken,
    getDbUser,
    getMembership,
    inviteExpiry,
    inviteUrl
} from '@/lib/workspace/service'
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
    const membership = user ? await getMembership(workspaceId, user.id) : null

    if (!can(membership?.role, 'member:invite')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invites = await prisma.workspaceInvite.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ invites })
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { workspaceId } = await params
    const { email, role = 'MEMBER' } = await request.json()

    const user = await getDbUser(userId)
    const membership = user ? await getMembership(workspaceId, user.id) : null

    if (!user || !can(membership?.role, 'member:invite')) {
        return NextResponse.json(
            { error: 'You do not have permission to invite people' },
            { status: 403 }
        )
    }

    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
        return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    if (!isRole(role) || !assignableRoles(membership!.role).includes(role)) {
        return NextResponse.json(
            { error: `You cannot assign the ${role} role` },
            { status: 403 }
        )
    }

    const normalisedEmail = email.trim().toLowerCase()

    // Already a member? Nothing to do.
    const existingMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId, user: { email: normalisedEmail } }
    })

    if (existingMember) {
        return NextResponse.json(
            { error: 'That person is already in this workspace' },
            { status: 409 }
        )
    }

    const token = createInviteToken()

    const invite = await prisma.workspaceInvite.upsert({
        where: { workspaceId_email: { workspaceId, email: normalisedEmail } },
        update: {
            role,
            token,
            status: 'PENDING',
            expiresAt: inviteExpiry(),
            invitedById: user.id,
            acceptedAt: null
        },
        create: {
            workspaceId,
            email: normalisedEmail,
            role,
            token,
            invitedById: user.id,
            expiresAt: inviteExpiry()
        }
    })

    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true }
    })

    // Email delivery is best effort — the link is returned either way so the
    // inviter can copy it manually.
    let emailSent = false
    try {
        await sendWorkspaceInviteEmail({
            to: normalisedEmail,
            workspaceName: workspace?.name ?? 'a workspace',
            inviterName: user.name || user.email || 'A teammate',
            role,
            url: inviteUrl(token)
        })
        emailSent = true
    } catch (error) {
        console.error('[workspaces] invite email failed:', error)
    }

    return NextResponse.json({
        success: true,
        invite,
        inviteUrl: inviteUrl(token),
        emailSent
    })
}
