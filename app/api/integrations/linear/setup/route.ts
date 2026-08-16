import { prisma } from '@/lib/db'
import { LinearAPI } from '@/lib/integrations/linear/linear'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

async function getIntegration(userId: string) {
    return prisma.userIntegration.findUnique({
        where: { userId_platform: { userId, platform: 'linear' } }
    })
}

export async function GET() {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const integration = await getIntegration(userId)

    if (!integration) {
        return NextResponse.json({ error: 'not connected' }, { status: 400 })
    }

    try {
        const teams = await new LinearAPI().getTeams(integration.accessToken)

        return NextResponse.json({
            teams,
            projects: teams,
            selectedId: integration.teamId,
            selectedName: integration.projectName
        })
    } catch (error) {
        console.error('[linear] setup fetch failed:', error)
        return NextResponse.json({ error: 'Failed to load Linear teams' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { projectId, projectName, createNew } = await request.json()
    const integration = await getIntegration(userId)

    if (!integration) {
        return NextResponse.json({ error: 'not connected' }, { status: 400 })
    }

    try {
        const linear = new LinearAPI()

        let teamId = projectId as string | undefined
        let teamName = projectName as string | undefined

        if (createNew) {
            if (!projectName) {
                return NextResponse.json(
                    { error: 'A name is required to create a team' },
                    { status: 400 }
                )
            }

            const created = await linear.createTeam(integration.accessToken, projectName)
            teamId = created.id
            teamName = created.name
        }

        if (!teamId) {
            return NextResponse.json(
                { error: 'Select a team or create a new one' },
                { status: 400 }
            )
        }

        await prisma.userIntegration.update({
            where: { id: integration.id },
            data: { teamId, projectId: teamId, projectName: teamName ?? 'Linear team' }
        })

        return NextResponse.json({ success: true, teamId, projectName: teamName })
    } catch (error) {
        console.error('[linear] setup save failed:', error)
        return NextResponse.json({ error: 'Failed to save Linear setup' }, { status: 500 })
    }
}
