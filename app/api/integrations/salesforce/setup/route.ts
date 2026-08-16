import { prisma } from '@/lib/db'
import { refreshTokenIfNeeded } from '@/lib/integrations/refreshTokenIfNeeded'
import { SalesforceAPI } from '@/lib/integrations/salesforce/salesforce'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

async function getIntegration(userId: string) {
    const integration = await prisma.userIntegration.findUnique({
        where: { userId_platform: { userId, platform: 'salesforce' } }
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

    if (!integration?.instanceUrl) {
        return NextResponse.json({ error: 'not connected' }, { status: 400 })
    }

    try {
        const campaigns = await new SalesforceAPI().getCampaigns(
            integration.accessToken,
            integration.instanceUrl
        )

        return NextResponse.json({
            campaigns,
            projects: campaigns,
            selectedId: integration.projectId,
            selectedName: integration.projectName,
            // Salesforce can accept tasks with no parent record at all.
            optional: true
        })
    } catch (error) {
        console.error('[salesforce] setup fetch failed:', error)
        return NextResponse.json(
            { error: 'Failed to load Salesforce campaigns' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { projectId, projectName, createNew } = await request.json()
    const integration = await getIntegration(userId)

    if (!integration?.instanceUrl) {
        return NextResponse.json({ error: 'not connected' }, { status: 400 })
    }

    try {
        const salesforce = new SalesforceAPI()

        let campaignId = projectId as string | undefined
        let campaignName = projectName as string | undefined

        if (createNew) {
            if (!projectName) {
                return NextResponse.json(
                    { error: 'A name is required to create a campaign' },
                    { status: 400 }
                )
            }

            const created = await salesforce.createCampaign(
                integration.accessToken,
                integration.instanceUrl,
                projectName
            )
            campaignId = created.id
            campaignName = created.name
        }

        await prisma.userIntegration.update({
            where: { id: integration.id },
            data: {
                projectId: campaignId ?? null,
                projectName: campaignName ?? 'My Tasks'
            }
        })

        return NextResponse.json({
            success: true,
            projectId: campaignId,
            projectName: campaignName
        })
    } catch (error) {
        console.error('[salesforce] setup save failed:', error)
        return NextResponse.json(
            { error: 'Failed to save Salesforce setup' },
            { status: 500 }
        )
    }
}
