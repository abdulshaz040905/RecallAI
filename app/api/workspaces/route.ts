import { prisma } from '@/lib/db'
import { createWorkspace, getDbUser, listWorkspacesForUser } from '@/lib/workspace/service'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const user = await getDbUser(userId)

    if (!user) {
        return NextResponse.json({ workspaces: [], activeWorkspaceId: null })
    }

    const workspaces = await listWorkspacesForUser(user.id)

    return NextResponse.json({
        workspaces,
        activeWorkspaceId: user.activeWorkspaceId
    })
}

export async function POST(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { name, about } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
            { error: 'Workspace name must be at least 2 characters' },
            { status: 400 }
        )
    }

    const user = await getDbUser(userId)

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Keep free plans from creating unlimited workspaces.
    const existingCount = await prisma.workspaceMember.count({
        where: { userId: user.id, role: 'OWNER' }
    })

    const maxWorkspaces = user.currentPlan === 'free' ? 1 : 25

    if (existingCount >= maxWorkspaces) {
        return NextResponse.json(
            {
                error:
                    user.currentPlan === 'free'
                        ? 'The free plan includes one workspace. Upgrade to create more.'
                        : 'Workspace limit reached.'
            },
            { status: 403 }
        )
    }

    try {
        const workspace = await createWorkspace({
            userId: user.id,
            name,
            about
        })

        return NextResponse.json({ success: true, workspace }, { status: 201 })
    } catch (error) {
        console.error('[workspaces] create failed:', error)
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }
}
