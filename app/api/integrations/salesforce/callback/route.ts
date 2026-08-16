import { prisma } from '@/lib/db'
import { integrationsRedirect, verifyOAuthState } from '@/lib/integrations/oauth-state'
import { salesforceLoginUrl } from '@/lib/integrations/salesforce/refreshToken'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')
    const state = verifyOAuthState(searchParams.get('state'), 'salesforce')

    if (!userId || !code || !state.valid || state.userId !== userId) {
        return NextResponse.redirect(
            integrationsRedirect({ error: 'auth_failed', platform: 'salesforce' })
        )
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.SALESFORCE_CLIENT_ID!,
            client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/salesforce/callback`
        })

        const tokenResponse = await fetch(`${salesforceLoginUrl()}/services/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('[salesforce] token exchange failed:', tokenData)
            throw new Error('Failed to exchange Salesforce code for a token')
        }

        let accountName: string | null = null
        try {
            if (tokenData.id) {
                const identity = await fetch(tokenData.id, {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` }
                }).then((r) => (r.ok ? r.json() : null))
                accountName = identity?.organization_id
                    ? identity.display_name || identity.username
                    : null
            }
        } catch {
            // Identity lookup is best effort.
        }

        const payload = {
            accessToken: tokenData.access_token as string,
            refreshToken: (tokenData.refresh_token as string) ?? null,
            instanceUrl: (tokenData.instance_url as string) ?? null,
            // Salesforce omits expires_in; sessions typically last ~2 hours.
            expiresAt: new Date(Date.now() + Number(tokenData.expires_in ?? 7200) * 1000),
            accountName,
            metadata: { identityUrl: tokenData.id ?? null, scope: tokenData.scope ?? null }
        }

        await prisma.userIntegration.upsert({
            where: { userId_platform: { userId, platform: 'salesforce' } },
            update: { ...payload, updatedAt: new Date() },
            create: { userId, platform: 'salesforce', ...payload }
        })

        return NextResponse.redirect(
            integrationsRedirect({ success: 'salesforce_connected', setup: 'salesforce' })
        )
    } catch (error) {
        console.error('[salesforce] callback error:', error)
        return NextResponse.redirect(
            integrationsRedirect({ error: 'save_failed', platform: 'salesforce' })
        )
    }
}
