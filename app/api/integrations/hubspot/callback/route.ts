import { prisma } from '@/lib/db'
import { HubSpotAPI } from '@/lib/integrations/hubspot/hubspot'
import { integrationsRedirect, verifyOAuthState } from '@/lib/integrations/oauth-state'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')
    const state = verifyOAuthState(searchParams.get('state'), 'hubspot')

    if (!userId || !code || !state.valid || state.userId !== userId) {
        return NextResponse.redirect(
            integrationsRedirect({ error: 'auth_failed', platform: 'hubspot' })
        )
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: process.env.HUBSPOT_CLIENT_ID!,
            client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback`,
            code
        })

        const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('[hubspot] token exchange failed:', tokenData)
            throw new Error('Failed to exchange HubSpot code for a token')
        }

        let portalId: string | null = null
        let accountName: string | null = null

        try {
            const info = await new HubSpotAPI().getTokenInfo(tokenData.access_token)
            portalId = info?.hub_id ? String(info.hub_id) : null
            accountName = info?.hub_domain ?? null
        } catch {
            // Best effort — connection still works without hub metadata.
        }

        const payload = {
            accessToken: tokenData.access_token as string,
            refreshToken: (tokenData.refresh_token as string) ?? null,
            expiresAt: new Date(Date.now() + Number(tokenData.expires_in ?? 1800) * 1000),
            portalId,
            accountName
        }

        await prisma.userIntegration.upsert({
            where: { userId_platform: { userId, platform: 'hubspot' } },
            update: { ...payload, updatedAt: new Date() },
            create: { userId, platform: 'hubspot', ...payload }
        })

        return NextResponse.redirect(
            integrationsRedirect({ success: 'hubspot_connected', setup: 'hubspot' })
        )
    } catch (error) {
        console.error('[hubspot] callback error:', error)
        return NextResponse.redirect(
            integrationsRedirect({ error: 'save_failed', platform: 'hubspot' })
        )
    }
}
