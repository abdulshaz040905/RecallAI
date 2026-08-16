'use client'

import type { CSSProperties, ElementType, ReactNode, Ref } from 'react'
import { Fragment } from 'react'
import { useReveal } from './use-reveal'

type SplitTextProps = {
    /** Plain text, or an array of lines. Each line becomes its own row. */
    children: string | string[]
    as?: ElementType
    className?: string
    /** Delay before the first word, in milliseconds. */
    delay?: number
    /** Per-word stagger, in milliseconds. */
    stagger?: number
    style?: CSSProperties
}

/**
 * Headline that rises word-by-word out of a mask.
 *
 * Words are split at render time — no measuring, no layout thrash, no
 * client-only text swap — and each one gets a CSS transition-delay, so the
 * whole thing costs a single class flip at reveal time.
 */
export function SplitText({
    children,
    as: Tag = 'h2',
    className,
    delay = 0,
    stagger = 45,
    style
}: SplitTextProps) {
    const ref = useReveal<HTMLElement>()
    const Component = Tag as 'h2'

    const lines = Array.isArray(children) ? children : [children]
    let wordIndex = 0

    return (
        <Component
            ref={ref as Ref<HTMLHeadingElement>}
            className={className}
            style={style}
        >
            {lines.map((line, lineIdx) => (
                <Fragment key={lineIdx}>
                    {lineIdx > 0 && <br />}
                    {line.split(' ').map((word, i) => {
                        const wordDelay = delay + wordIndex * stagger
                        wordIndex += 1
                        return (
                            <Fragment key={`${lineIdx}-${i}`}>
                                <span
                                    className="split-word"
                                    style={
                                        { '--word-delay': `${wordDelay}ms` } as CSSProperties
                                    }
                                >
                                    <span>{word}</span>
                                </span>
                                {i < line.split(' ').length - 1 ? ' ' : null}
                            </Fragment>
                        )
                    })}
                </Fragment>
            ))}
        </Component>
    )
}

/**
 * Same rise-out-of-a-mask treatment, but for arbitrary JSX — useful when a
 * headline contains a styled span that plain string splitting would destroy.
 */
export function MaskLine({
    children,
    className,
    delay = 0
}: {
    children: ReactNode
    className?: string
    delay?: number
}) {
    const ref = useReveal<HTMLDivElement>()

    return (
        <div ref={ref} className={className}>
            <span
                className="split-word"
                style={{ '--word-delay': `${delay}ms` } as CSSProperties}
            >
                <span>{children}</span>
            </span>
        </div>
    )
}
