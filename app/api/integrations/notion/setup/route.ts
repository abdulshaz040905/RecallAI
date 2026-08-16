import { prisma } from '@/lib/db'
import { NotionAPI } from '@/lib/integrations/notion/notion'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

async function getIntegration(userId: string) {
    return prisma.userIntegration.findUnique({
        where: { userId_platform: { userId, platform: 'notion' } }
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
        const notion = new NotionAPI()
        const [databases, pages] = await Promise.all([
            notion.listDatabases(integration.accessToken),
            notion.listPages(integration.accessToken)
        ])

        return NextResponse.json({
            databases,
            // The generic SetupForm reads `projects`, so mirror it there too.
            projects: databases,
            pages,
            selectedId: integration.databaseId,
            selectedName: integration.projectName
        })
    } catch (error) {
        console.error('[notion] setup fetch failed:', error)
        return NextResponse.json(
            { error: 'Failed to load Notion databases' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, projectName, createNew, parentPageId } = body

    const integration = await getIntegration(userId)

    if (!integration) {
        return NextResponse.json({ error: 'not connected' }, { status: 400 })
    }

    try {
        const notion = new NotionAPI()

        let databaseId = projectId as string | undefined
        let databaseName = projectName as string | undefined

        if (createNew) {
            if (!projectName) {
                return NextResponse.json(
                    { error: 'A name is required to create a database' },
                    { status: 400 }
                )
            }

            // Fall back to the first page we can write to if none was picked.
            let parent = parentPageId as string | undefined
            if (!parent) {
                const pages = await notion.listPages(integration.accessToken)
                parent = pages[0]?.id
            }

            if (!parent) {
                return NextResponse.json(
                    {
                        error:
                            'Notion needs a parent page. Share at least one page with the Recall AI integration and try again.'
                    },
                    { status: 400 }
                )
            }

            const created = await notion.createDatabase(
                integration.accessToken,
                parent,
                projectName
            )

            databaseId = created.id
            databaseName = projectName
        }

        if (!databaseId) {
            return NextResponse.json(
                { error: 'Select a database or create a new one' },
                { status: 400 }
            )
        }

        await prisma.userIntegration.update({
            where: { id: integration.id },
            data: {
                databaseId,
                projectId: databaseId,
                projectName: databaseName ?? 'Action Items'
            }
        })

        return NextResponse.json({
            success: true,
            databaseId,
            projectName: databaseName
        })
    } catch (error) {
        console.error('[notion] setup save failed:', error)
        return NextResponse.json({ error: 'Failed to save Notion setup' }, { status: 500 })
    }
}
