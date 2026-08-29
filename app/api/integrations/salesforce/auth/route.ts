import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createOAuthState } from '@/lib/integrations/oauth-state'
import { salesforceLoginUrl } from '@/lib/integrations/salesforce/refreshToken'
import {
    createCodeChallenge,
    createCodeVerifier,
    PKCE_COOKIE_MAX_AGE,
    pkceCookieName
} from '@/lib/integrations/pkce'

export async function GET() {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!process.env.SALESFORCE_CLIENT_ID) {
        return NextResponse.json(
            { error: 'Salesforce integration is not configured on the server' },
            { status: 500 }
        )
    }

    // Salesforce enforces PKCE; the verifier is kept in an httpOnly cookie so it
    // never travels to the provider, and read back in the callback.
    const verifier = createCodeVerifier()

    const url = new URL(`${salesforceLoginUrl()}/services/oauth2/authorize`)
    url.searchParams.set('client_id', process.env.SALESFORCE_CLIENT_ID)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set(
        'redirect_uri',
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/salesforce/callback`
    )
    // refresh_token requires the "Perform requests at any time" scope.
    url.searchParams.set('scope', 'api refresh_token offline_access id')
    url.searchParams.set('state', createOAuthState(userId, 'salesforce'))
    url.searchParams.set('code_challenge', createCodeChallenge(verifier))
    url.searchParams.set('code_challenge_method', 'S256')

    const response = NextResponse.redirect(url)

    response.cookies.set(pkceCookieName('salesforce'), verifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: PKCE_COOKIE_MAX_AGE
    })

    return response
}
