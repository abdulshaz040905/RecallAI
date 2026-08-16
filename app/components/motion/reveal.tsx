'use client'

import type { CSSProperties, ElementType, ReactNode, Ref } from 'react'
import { useReveal } from './use-reveal'

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale'

type RevealProps = {
    children: ReactNode
    /** Rendered element. Defaults to a div. */
    as?: ElementType
    direction?: Direction
    /** Stagger, in milliseconds. */
    delay?: number
    className?: string
    style?: CSSProperties
    id?: string
}

/**
 * Scroll-into-view reveal.
 *
 * All of the animation lives in CSS (`[data-reveal]` in globals.css); this only
 * decides when to flip the flag, via the shared observer.
 */
export function Reveal({
    children,
    as: Tag = 'div',
    direction = 'up',
    delay = 0,
    className,
    style,
    id
}: RevealProps) {
    const ref = useReveal<HTMLElement>()
    // `as` is deliberately loose for callers; narrow it once here so the ref
    // and DOM props typecheck.
    const Component = Tag as 'div'

    return (
        <Component
            ref={ref as Ref<HTMLDivElement>}
            id={id}
            data-reveal={direction}
            className={className}
            style={{ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties}
        >
            {children}
        </Component>
    )
}
