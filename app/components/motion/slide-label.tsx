import type { ReactNode } from 'react'

/**
 * Button/link label that swaps for a clone of itself on hover.
 *
 * Two identical rows stacked in a masked box; hovering slides the stack up by
 * half its height. Server-renderable, no JS, single composited transform.
 */
export function SlideLabel({ children }: { children: ReactNode }) {
    return (
        <span className="btn-slide__inner">
            <span className="btn-slide__stack">
                <span className="btn-slide__row">{children}</span>
                <span className="btn-slide__row" aria-hidden>
                    {children}
                </span>
            </span>
        </span>
    )
}
