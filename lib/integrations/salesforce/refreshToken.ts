import { prisma } from '@/lib/db'
import { UserIntegration } from '@prisma/client'

export function salesforceLoginUrl() {
    return process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
}

export async function refreshSalesforceToken(integration: UserIntegration) {
    if (!integration.refreshToken) {
        throw new Error('No Salesforce refresh token stored — reconnect required')
    }

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.SALESFORCE_CLIENT_ID!,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
        refresh_token: integration.refreshToken
    })

    const response = await fetch(`${salesforceLoginUrl()}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    })

    const data = await response.json()

    if (!response.ok) {
        console.error('[salesforce] token refresh failed:', data)
        throw new Error('Salesforce token refresh failed')
    }

    // Salesforce access tokens are session-scoped; default to 2h if unspecified.
    const expiresIn = Number(data.expires_in ?? 7200)

    return prisma.userIntegration.update({
        where: { id: integration.id },
        data: {
            accessToken: data.access_token,
            // Salesforce does not rotate refresh tokens on refresh.
            refreshToken: data.refresh_token ?? integration.refreshToken,
            instanceUrl: data.instance_url ?? integration.instanceUrl,
            expiresAt: new Date(Date.now() + expiresIn * 1000)
        }
    })
}
