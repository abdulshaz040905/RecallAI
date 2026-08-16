'use client'

import { useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AppSidebar } from './app-sidebar'
import { MobileNav } from './mobile-nav'

/**
 * Lenis + GSAP only ship on the marketing routes. The dashboard scrolls inside
 * its own container, where smooth-scroll hijacking would be wrong anyway.
 */
const SmoothScroll = dynamic(
    () => import('./motion/smooth-scroll').then((m) => m.SmoothScroll),
    { ssr: false }
)

/** Routes that render full-bleed with no app chrome. */
const BARE_ROUTES = ['/', '/sign-in', '/sign-up', '/workspaces/join']

/** Bare routes long enough to benefit from smooth scrolling. */
const SMOOTH_ROUTES = ['/']

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isSignedIn } = useAuth()

    const isBare =
        BARE_ROUTES.some(
            (route) => pathname === route || pathname.startsWith(`${route}/`)
        ) ||
        // Shared meeting links viewed by signed-out people get no sidebar.
        (pathname.startsWith('/meeting/') && !isSignedIn)

    const isSmooth = SMOOTH_ROUTES.includes(pathname)

    if (isBare) {
        return (
            <div className="min-h-screen">
                {isSmooth && <SmoothScroll />}
                {children}
            </div>
        )
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-paper">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>
            <MobileNav />
        </div>
    )
}
