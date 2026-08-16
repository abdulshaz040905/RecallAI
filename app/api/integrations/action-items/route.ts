import { prisma } from '@/lib/db'
import { dispatchActionItem, IntegrationConfigError } from '@/lib/integrations/dispatch'
import { refreshTokenIfNeeded } from '@/lib/integrations/refreshTokenIfNeeded'
import { isIntegrationPlatform } from '@/lib/integrations/types'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, actionItem, meetingId, dueDate } = body

    // Accept a single platform or a list so the UI can fan out in one request.
    const platforms: string[] = Array.isArray(platform) ? platform : [platform]

    if (platforms.some((p) => !p || !isIntegrationPlatform(p))) {
        return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
    }

    const title =
        typeof actionItem === 'string' ? actionItem : actionItem?.text || actionItem?.title

    if (!title) {
        return NextResponse.json({ error: 'Action item text is required' }, { status: 400 })
    }

    const meeting = meetingId
        ? await prisma.meeting.findFirst({
              where: { id: meetingId, userId },
              select: { title: true, startTime: true }
          })
        : null

    const description = meeting
        ? `Action item from "${meeting.title}" on ${new Date(
              meeting.startTime
          ).toLocaleDateString()} — captured by Recall AI.`
        : 'Action item captured by Recall AI.'

    const results: Array<{ platform: string; ok: boolean; error?: string; url?: string }> = []

    for (const target of platforms) {
        try {
            let integration = await prisma.userIntegration.findUnique({
                where: { userId_platform: { userId, platform: target } }
            })

            if (!integration) {
                results.push({ platform: target, ok: false, error: 'Not connected' })
                continue
            }

            try {
                integration = await refreshTokenIfNeeded(integration)
            } catch (error) {
                console.error(`[${target}] token refresh failed:`, error)
                results.push({
                    platform: target,
                    ok: false,
                    error: `Reconnect your ${target} integration`
                })
                continue
            }

            const result = await dispatchActionItem(integration, {
                title,
                description,
                dueDate
            })

            results.push({ platform: target, ok: true, url: result.url })
        } catch (error) {
            const message =
                error instanceof IntegrationConfigError
                    ? error.message
                    : `Failed to create action item in ${target}`

            console.error(`[${target}] action item dispatch failed:`, error)
            results.push({ platform: target, ok: false, error: message })
        }
    }

    const allFailed = results.every((r) => !r.ok)

    return NextResponse.json(
        { success: !allFailed, results },
        { status: allFailed ? 400 : 200 }
    )
}
