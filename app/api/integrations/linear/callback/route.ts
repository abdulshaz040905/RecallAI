import { prisma } from '@/lib/db'
import { LinearAPI } from '@/lib/integrations/linear/linear'
import { integrationsRedirect, verifyOAuthState } from '@/lib/integrations/oauth-state'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')
    const state = verifyOAuthState(searchParams.get('state'), 'linear')

    if (!userId || !code || !state.valid || state.userId !== userId) {
        return NextResponse.redirect(
            integrationsRedirect({ error: 'auth_failed', platform: 'linear' })
        )
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.LINEAR_CLIENT_ID!,
            client_secret: process.env.LINEAR_CLIENT_SECRET!,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/linear/callback`
        })

        const tokenResponse = await fetch('https://api.linear.app/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('[linear] token exchange failed:', tokenData)
            throw new Error('Failed to exchange Linear code for a token')
        }

        // Linear tokens are long lived (10 years) but the API still returns an
        // expires_in that we store so the UI can surface it.
        const expiresIn = Number(tokenData.expires_in ?? 0)

        let accountName: string | null = null
        try {
            const viewer = await new LinearAPI().getViewer(tokenData.access_token)
            accountName = viewer?.name ?? null
        } catch {
            // Non fatal — the connection still works without a display name.
        }

        const payload = {
            accessToken: tokenData.access_token as string,
            refreshToken: (tokenData.refresh_token as string) ?? null,
            expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
            accountName
        }

        await prisma.userIntegration.upsert({
            where: { userId_platform: { userId, platform: 'linear' } },
            update: { ...payload, updatedAt: new Date() },
            create: { userId, platform: 'linear', ...payload }
        })

        return NextResponse.redirect(
            integrationsRedirect({ success: 'linear_connected', setup: 'linear' })
        )
    } catch (error) {
        console.error('[linear] callback error:', error)
        return NextResponse.redirect(
            integrationsRedirect({ error: 'save_failed', platform: 'linear' })
        )
    }
}
