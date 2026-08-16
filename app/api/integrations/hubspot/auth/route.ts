import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createOAuthState } from '@/lib/integrations/oauth-state'

export async function GET() {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!process.env.HUBSPOT_CLIENT_ID) {
        return NextResponse.json(
            { error: 'HubSpot integration is not configured on the server' },
            { status: 500 }
        )
    }

    const url = new URL('https://app.hubspot.com/oauth/authorize')
    url.searchParams.set('client_id', process.env.HUBSPOT_CLIENT_ID)
    url.searchParams.set(
        'redirect_uri',
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback`
    )
    url.searchParams.set(
        'scope',
        process.env.HUBSPOT_SCOPES || 'oauth crm.objects.deals.read crm.objects.deals.write'
    )
    url.searchParams.set('state', createOAuthState(userId, 'hubspot'))

    return NextResponse.redirect(url)
}
