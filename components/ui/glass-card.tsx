import * as React from 'react'
import { cn } from '@/lib/utils'

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
    /** `strong` sits on paper rather than card white — use for nested panels. */
    variant?: 'default' | 'strong'
    /** Lifts 3px on hover. */
    interactive?: boolean
}

/**
 * The standard panel.
 *
 * Named for the old frosted-glass theme it replaced; it is now a plain
 * hairline-bordered surface. The name is kept so the dozens of call sites
 * don't all have to churn.
 */
export function GlassCard({
    className,
    variant = 'default',
    interactive = false,
    ...props
}: GlassCardProps) {
    return (
        <div
            className={cn(
                'rounded-[var(--radius)] border border-line',
                variant === 'strong' ? 'bg-paper-2' : 'bg-card',
                interactive && 'surface-hover cursor-pointer',
                className
            )}
            {...props}
        />
    )
}

export function GlassCardHeader({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
}

export function GlassCardTitle({
    className,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn(
                'font-display text-[16px] font-medium tracking-[-0.02em]',
                className
            )}
            {...props}
        />
    )
}

export function GlassCardDescription({
    className,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn('text-sm leading-relaxed text-ink-soft', className)}
            {...props}
        />
    )
}

export function GlassCardContent({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function GlassCardFooter({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('flex items-center gap-2 p-5 pt-0', className)}
            {...props}
        />
    )
}
