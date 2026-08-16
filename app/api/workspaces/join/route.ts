import { acceptInvite, getDbUser } from '@/lib/workspace/service'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REASON_STATUS: Record<string, number> = {
    not_found: 404,
    already_used: 409,
    expired: 410,
    wrong_account: 403
}

const REASON_MESSAGE: Record<string, string> = {
    not_found: 'This invite link is not valid.',
    already_used: 'This invite has already been used or revoked.',
    expired: 'This invite has expired. Ask for a new one.',
    wrong_account: 'This invite was sent to a different email address.'
}

export async function POST(request: NextRequest) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Missing invite token' }, { status: 400 })
    }

    const [user, clerkUser] = await Promise.all([getDbUser(userId), currentUser()])

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const email =
        user.email || clerkUser?.emailAddresses?.[0]?.emailAddress || null

    const result = await acceptInvite(token, user.id, email)

    if (!result.ok) {
        return NextResponse.json(
            { error: REASON_MESSAGE[result.reason] ?? 'Could not accept invite' },
            { status: REASON_STATUS[result.reason] ?? 400 }
        )
    }

    return NextResponse.json({
        success: true,
        workspace: result.workspace,
        role: result.role
    })
}
