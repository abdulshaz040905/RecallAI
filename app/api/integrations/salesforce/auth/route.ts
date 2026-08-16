import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createOAuthState } from '@/lib/integrations/oauth-state'
import { salesforceLoginUrl } from '@/lib/integrations/salesforce/refreshToken'

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

    return NextResponse.redirect(url)
}
