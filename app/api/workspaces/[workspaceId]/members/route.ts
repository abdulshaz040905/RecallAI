import { prisma } from '@/lib/db'
import { can } from '@/lib/workspace/rbac'
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
    const membership = user ? await getMembership(workspaceId, user.id) : null

    if (!can(membership?.role, 'member:view')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        orderBy: { joinedAt: 'asc' },
        include: {
            user: { select: { id: true, name: true, email: true, imageUrl: true } }
        }
    })

    return NextResponse.json({
        members: members.map((member) => ({
            id: member.id,
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            name: member.user.name,
            email: member.user.email,
            imageUrl: member.user.imageUrl
        })),
        viewerRole: membership?.role
    })
}
