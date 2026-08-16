import { prisma } from '@/lib/db'
import { integrationsRedirect, verifyOAuthState } from '@/lib/integrations/oauth-state'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')
    const state = verifyOAuthState(searchParams.get('state'), 'notion')

    if (!userId || !code || !state.valid || state.userId !== userId) {
        return NextResponse.redirect(
            integrationsRedirect({ error: 'auth_failed', platform: 'notion' })
        )
    }

    try {
        const basic = Buffer.from(
            `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
        ).toString('base64')

        const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/callback`
            })
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('[notion] token exchange failed:', tokenData)
            throw new Error('Failed to exchange Notion code for a token')
        }

        const payload = {
            accessToken: tokenData.access_token as string,
            workspaceId: (tokenData.workspace_id as string) ?? null,
            accountName: (tokenData.workspace_name as string) ?? null,
            // Notion tokens do not expire.
            expiresAt: null,
            metadata: {
                botId: tokenData.bot_id ?? null,
                workspaceIcon: tokenData.workspace_icon ?? null,
                owner: tokenData.owner ?? null
            }
        }

        await prisma.userIntegration.upsert({
            where: { userId_platform: { userId, platform: 'notion' } },
            update: { ...payload, updatedAt: new Date() },
            create: { userId, platform: 'notion', ...payload }
        })

        return NextResponse.redirect(
            integrationsRedirect({ success: 'notion_connected', setup: 'notion' })
        )
    } catch (error) {
        console.error('[notion] callback error:', error)
        return NextResponse.redirect(
            integrationsRedirect({ error: 'save_failed', platform: 'notion' })
        )
    }
}
