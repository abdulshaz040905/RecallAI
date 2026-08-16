import { prisma } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

interface PlatformMeta {
    platform: string
    name: string
    logo: string
    /** Which stored column holds the human readable destination. */
    destinationField: 'boardName' | 'projectName' | 'channelName' | null
}

const PLATFORMS: PlatformMeta[] = [
    { platform: 'trello', name: 'Trello', logo: '/trello.png', destinationField: 'boardName' },
    { platform: 'jira', name: 'Jira', logo: '/jira.png', destinationField: 'projectName' },
    { platform: 'asana', name: 'Asana', logo: '/asana.png', destinationField: 'projectName' },
    { platform: 'notion', name: 'Notion', logo: '/notion.svg', destinationField: 'projectName' },
    { platform: 'linear', name: 'Linear', logo: '/linear.svg', destinationField: 'projectName' },
    {
        platform: 'salesforce',
        name: 'Salesforce',
        logo: '/salesforce.svg',
        destinationField: 'projectName'
    },
    {
        platform: 'hubspot',
        name: 'HubSpot',
        logo: '/hubspot.svg',
        destinationField: 'projectName'
    }
]

export async function GET() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }

        const [integrations, dbUser] = await Promise.all([
            prisma.userIntegration.findMany({ where: { userId } }),
            prisma.user.findUnique({ where: { clerkId: userId } })
        ])

        const result: any[] = PLATFORMS.map((meta) => {
            const integration = integrations.find((i) => i.platform === meta.platform)

            return {
                ...meta,
                connected: !!integration,
                configured: !!(
                    integration?.boardId ||
                    integration?.projectId ||
                    integration?.databaseId ||
                    integration?.teamId
                ),
                boardName: integration?.boardName ?? undefined,
                projectName: integration?.projectName ?? undefined,
                accountName: integration?.accountName ?? undefined
            }
        })

        result.push({
            platform: 'slack',
            name: 'Slack',
            logo: '/slack.png',
            connected: !!dbUser?.slackConnected,
            configured: !!dbUser?.preferredChannelId,
            channelName: dbUser?.preferredChannelName || undefined
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('[integrations] status fetch failed:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
