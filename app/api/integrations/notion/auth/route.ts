import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createOAuthState } from '@/lib/integrations/oauth-state'

export async function GET() {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!process.env.NOTION_CLIENT_ID) {
        return NextResponse.json(
            { error: 'Notion integration is not configured on the server' },
            { status: 500 }
        )
    }

    const url = new URL('https://api.notion.com/v1/oauth/authorize')
    url.searchParams.set('client_id', process.env.NOTION_CLIENT_ID)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('owner', 'user')
    url.searchParams.set(
        'redirect_uri',
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/callback`
    )
    url.searchParams.set('state', createOAuthState(userId, 'notion'))

    return NextResponse.redirect(url)
}
