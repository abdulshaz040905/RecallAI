import { prisma } from '@/lib/db'
import { HubSpotAPI } from '@/lib/integrations/hubspot/hubspot'
import { refreshTokenIfNeeded } from '@/lib/integrations/refreshTokenIfNeeded'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

async function getIntegration(userId: string) {
    const integration = await prisma.userIntegration.findUnique({
        where: { userId_platform: { userId, platform: 'hubspot' } }
    })

    if (!integration) {
        return null
    }

    return refreshTokenIfNeeded(integration)
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
        const deals = await new HubSpotAPI().getDeals(integration.accessToken)

        return NextResponse.json({
            deals,
            projects: deals,
            selectedId: integration.projectId,
            selectedName: integration.projectName,
            // Tasks can live standalone in HubSpot, so a deal is optional.
            optional: true
        })
    } catch (error) {
        console.error('[hubspot] setup fetch failed:', error)
        return NextResponse.json({ error: 'Failed to load HubSpot deals' }, { status: 500 })
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
        const hubspot = new HubSpotAPI()

        let dealId = projectId as string | undefined
        let dealName = projectName as string | undefined

        if (createNew) {
            if (!projectName) {
                return NextResponse.json(
                    { error: 'A name is required to create a deal' },
                    { status: 400 }
                )
            }

            const created = await hubspot.createDeal(integration.accessToken, projectName)
            dealId = created.id
            dealName = created.name
        }

        await prisma.userIntegration.update({
            where: { id: integration.id },
            data: {
                projectId: dealId ?? null,
                projectName: dealName ?? 'Standalone tasks'
            }
        })

        return NextResponse.json({ success: true, projectId: dealId, projectName: dealName })
    } catch (error) {
        console.error('[hubspot] setup save failed:', error)
        return NextResponse.json({ error: 'Failed to save HubSpot setup' }, { status: 500 })
    }
}
