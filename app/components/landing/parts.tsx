import Link from 'next/link'
import type { ReactNode } from 'react'
import { SlideLabel } from '../motion/slide-label'

/* ---------------------------------------------------------------------------
   Small shared pieces for the marketing pages. Everything here is a server
   component — no state, no effects, no client JS.
--------------------------------------------------------------------------- */

/** Uppercase mono label with a rule, used to open every section. */
export function SectionLabel({
    index,
    children
}: {
    index?: string
    children: ReactNode
}) {
    return (
        <div className="flex items-center gap-3">
            {index && (
                <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                    {index}
                </span>
            )}
            <span className="h-px w-8 bg-line-strong" />
            <span className="eyebrow">{children}</span>
        </div>
    )
}

const sizeClasses = {
    md: 'h-10 px-5 text-[13px]',
    lg: 'h-[52px] px-8 text-[14px]'
} as const

const toneClasses = {
    ink: 'bg-ink text-paper hover:bg-ink/85',
    paper: 'bg-paper text-ink hover:bg-white',
    accent: 'bg-vermilion hover:brightness-105',
    outline: 'border border-line-strong text-ink hover:bg-ink hover:text-paper'
} as const

type ActionProps = {
    children: ReactNode
    href?: string
    tone?: keyof typeof toneClasses
    size?: keyof typeof sizeClasses
    className?: string
}

/**
 * The signature button: label slides up and a clone slides in behind it.
 * Renders as a link when given `href`, otherwise a button (so it can be
 * wrapped by Clerk's `SignUpButton`).
 */
export function Action({
    children,
    href,
    tone = 'ink',
    size = 'md',
    className = ''
}: ActionProps) {
    const classes = `btn-slide font-medium tracking-[-0.01em] transition-[background-color,color,border-color,filter] duration-300 ${sizeClasses[size]} ${toneClasses[tone]} ${className}`

    if (href) {
        return (
            <Link href={href} className={classes}>
                <SlideLabel>{children}</SlideLabel>
            </Link>
        )
    }

    return (
        <button type="button" className={`${classes} cursor-pointer`}>
            <SlideLabel>{children}</SlideLabel>
        </button>
    )
}

/** Full-bleed hairline used to separate sections. */
export function Rule({ className = '' }: { className?: string }) {
    return <div className={`h-px w-full bg-line ${className}`} />
}

/** Diagonal arrow that nudges on hover of its parent group. */
export function ArrowMark({ className = '' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
            className={`h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${className}`}
        >
            <path
                d="M3 11L11 3M11 3H4.5M11 3V9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

/** Wordmark: a solid ink square with the product initial, then the name. */
export function Wordmark({
    className = '',
    invert = false
}: {
    className?: string
    invert?: boolean
}) {
    return (
        <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
            <span
                className={`flex h-7 w-7 items-center justify-center rounded-md font-display text-[13px] font-semibold ${
                    invert ? 'bg-paper text-ink' : 'bg-ink text-paper'
                }`}
            >
                R
            </span>
            <span className="font-display text-[15px] font-medium tracking-[-0.03em]">
                Recall
            </span>
        </Link>
    )
}
