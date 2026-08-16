'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { prefersReducedMotion } from './use-reveal'

type ParallaxProps = {
    children: ReactNode
    /** Total travel in pixels across the element's scroll range. */
    distance?: number
    className?: string
    style?: CSSProperties
}

/**
 * Scroll-linked vertical drift.
 *
 * The one place a scrubbed ScrollTrigger earns its keep. Used sparingly —
 * every instance is a per-frame callback, so a handful is fine and dozens
 * would not be.
 */
export function Parallax({
    children,
    distance = 80,
    className,
    style
}: ParallaxProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element || prefersReducedMotion()) return

        // Phones get no parallax: it costs the most where there is least to spare.
        if (window.matchMedia('(max-width: 768px)').matches) return

        let cleanup: (() => void) | undefined
        let cancelled = false

        void (async () => {
            const [{ gsap }, { ScrollTrigger }] = await Promise.all([
                import('gsap'),
                import('gsap/ScrollTrigger')
            ])
            if (cancelled) return

            gsap.registerPlugin(ScrollTrigger)

            const tween = gsap.fromTo(
                element,
                { y: -distance / 2 },
                {
                    y: distance / 2,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: element,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 0.6,
                        invalidateOnRefresh: true
                    }
                }
            )

            cleanup = () => {
                tween.scrollTrigger?.kill()
                tween.kill()
            }
        })()

        return () => {
            cancelled = true
            cleanup?.()
        }
    }, [distance])

    return (
        <div ref={ref} className={className} style={style}>
            {children}
        </div>
    )
}
