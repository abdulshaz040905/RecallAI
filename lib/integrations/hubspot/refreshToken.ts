import { prisma } from '@/lib/db'
import { UserIntegration } from '@prisma/client'

export async function refreshHubSpotToken(integration: UserIntegration) {
    if (!integration.refreshToken) {
        throw new Error('No HubSpot refresh token stored — reconnect required')
    }

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback`,
        refresh_token: integration.refreshToken
    })

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })

    const data = await response.json()

    if (!response.ok) {
        console.error('[hubspot] token refresh failed:', data)
        throw new Error('HubSpot token refresh failed')
    }

    return prisma.userIntegration.update({
        where: { id: integration.id },
        data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? integration.refreshToken,
            expiresAt: new Date(Date.now() + Number(data.expires_in ?? 1800) * 1000)
        }
    })
}
