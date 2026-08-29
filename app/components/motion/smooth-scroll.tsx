'use client'

import { useEffect } from 'react'
import { prefersReducedMotion } from './use-reveal'

/**
 * Lenis smooth scrolling, wired into GSAP's ticker.
 *
 * Deliberately conservative so this never becomes the thing that makes the
 * site feel heavy in production:
 *  - one RAF loop shared with GSAP (Lenis' own `autoRaf` is off)
 *  - `syncTouch: false`, so phones keep native momentum scrolling — hijacking
 *    touch is what makes smooth-scroll sites feel broken on mobile
 *  - nothing runs at all when the OS asks for reduced motion
 *  - GSAP and Lenis are dynamically imported, so they land in their own chunk
 *    and never touch the dashboard bundle
 */
export function SmoothScroll() {
    useEffect(() => {
        if (prefersReducedMotion()) return

        let dispose: (() => void) | undefined
        let cancelled = false

        void (async () => {
            const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
                import('lenis'),
                import('gsap'),
                import('gsap/ScrollTrigger')
            ])

            if (cancelled) return

            gsap.registerPlugin(ScrollTrigger)

            const lenis = new Lenis({
                duration: 1.05,
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                syncTouch: false,
                wheelMultiplier: 1,
                touchMultiplier: 1.6,
                autoRaf: false
            })

            // Expose for menus/modals that need to lock the page.
            ;(window as unknown as { lenis?: unknown }).lenis = lenis

            lenis.on('scroll', ScrollTrigger.update)

            const raf = (time: number) => lenis.raf(time * 1000)
            gsap.ticker.add(raf)
            gsap.ticker.lagSmoothing(0)

            // In-page anchors have to go through Lenis or they teleport.
            const onClick = (event: MouseEvent) => {
                const anchor = (event.target as HTMLElement | null)?.closest?.(
                    'a[href^="#"]'
                ) as HTMLAnchorElement | null
                if (!anchor) return

                const hash = anchor.getAttribute('href')
                if (!hash || hash === '#') return

                const target = document.querySelector(hash)
                if (!target) return

                event.preventDefault()
                lenis.scrollTo(target as HTMLElement, { offset: 100, duration: 1.2 })
            }

            document.addEventListener('click', onClick)

            // Late-loading fonts and images change page height.
            const refresh = () => ScrollTrigger.refresh()
            window.addEventListener('load', refresh)
            if (document.fonts?.ready) void document.fonts.ready.then(refresh)

            dispose = () => {
                document.removeEventListener('click', onClick)
                window.removeEventListener('load', refresh)
                gsap.ticker.remove(raf)
                lenis.destroy()
                ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
                delete (window as unknown as { lenis?: unknown }).lenis
            }
        })()

        return () => {
            cancelled = true
            dispose?.()
        }
    }, [])

    return null
}
