import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Auth is deny-by-default.
 *
 * Everything not listed below requires a session, so a new page or API route
 * is protected the moment it is created rather than the moment someone
 * remembers to add it to a list. The previous allow-list approach had the
 * opposite failure mode.
 */
const isPublicRoute = createRouteMatcher([
    // Marketing. Pricing lives here as the #pricing section.
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',

    // Third parties post here with their own signatures and no Clerk cookie —
    // requiring auth would break them silently.
    '/api/webhooks(.*)',
    '/api/slack/install',
    '/api/slack/oauth',
    '/api/slack/events',

    // Shared meeting links: a signed-out viewer gets the read-only view.
    '/meeting/(.*)'
])

/** API routes get a 401 rather than a redirect to an HTML sign-in page. */
function isApiRequest(pathname: string) {
    return pathname.startsWith('/api/')
}

export default clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) {
        return NextResponse.next()
    }

    const { userId, redirectToSignIn } = await auth()

    if (!userId) {
        if (isApiRequest(req.nextUrl.pathname)) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Send them back where they were headed once they've signed in.
        return redirectToSignIn({ returnBackUrl: req.url })
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        // Skip Next.js internals and static files unless referenced in search params.
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes.
        '/(api|trpc)(.*)'
    ]
}
