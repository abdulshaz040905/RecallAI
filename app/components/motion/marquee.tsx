'use client'

import type { CSSProperties, ReactNode } from 'react'

type MarqueeProps = {
    children: ReactNode
    /** Seconds for one full loop. Bigger = slower. */
    duration?: number
    direction?: 'left' | 'right'
    /** Drop the fade mask at the edges. */
    bleed?: boolean
    className?: string
}

/**
 * Infinite horizontal marquee.
 *
 * Pure CSS keyframes on a duplicated track: one composited transform, no JS
 * on scroll, no layout work. `aria-hidden` on the clone keeps screen readers
 * from reading everything twice.
 */
export function Marquee({
    children,
    duration = 40,
    direction = 'left',
    bleed = false,
    className
}: MarqueeProps) {
    return (
        <div
            className={`marquee ${bleed ? 'marquee--bleed' : ''} ${className ?? ''}`}
            data-direction={direction}
            style={{ '--marquee-duration': `${duration}s` } as CSSProperties}
        >
            <div className="marquee__track">
                {children}
                <span aria-hidden className="contents">
                    {children}
                </span>
            </div>
        </div>
    )
}
