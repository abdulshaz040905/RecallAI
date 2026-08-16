import type { ReactNode } from 'react'

/* ---------------------------------------------------------------------------
   Shared chrome for the signed-in pages, so every screen has the same rhythm:
   a hairline top bar with a mono eyebrow and a display title, then content on
   a fixed measure.
--------------------------------------------------------------------------- */

export function PageHeader({
    eyebrow,
    title,
    description,
    actions
}: {
    eyebrow: string
    title: string
    description?: string
    actions?: ReactNode
}) {
    return (
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-8 sm:py-7">
                <div className="min-w-0">
                    <p className="eyebrow mb-2.5">{eyebrow}</p>
                    <h1 className="font-display text-[26px] font-medium leading-none tracking-[-0.035em] sm:text-[32px]">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-2.5 max-w-[52ch] text-[14px] leading-relaxed text-ink-soft">
                            {description}
                        </p>
                    )}
                </div>

                {actions && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
                )}
            </div>
        </header>
    )
}

export function PageBody({
    children,
    className = ''
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <div className={`mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10 ${className}`}>
            {children}
        </div>
    )
}

/** Section heading used inside a page body. */
export function SectionHeading({
    children,
    aside
}: {
    children: ReactNode
    aside?: ReactNode
}) {
    return (
        <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-3">
            <h2 className="font-display text-[15px] font-medium tracking-[-0.02em]">
                {children}
            </h2>
            {aside}
        </div>
    )
}

/** Consistent empty state: hairline box, mono label, one sentence. */
export function EmptyState({
    title,
    description,
    action
}: {
    title: string
    description: string
    action?: ReactNode
}) {
    return (
        <div className="rounded-[var(--radius)] border border-dashed border-line-strong px-8 py-16 text-center">
            <p className="font-display text-[18px] font-medium tracking-[-0.02em]">
                {title}
            </p>
            <p className="mx-auto mt-2.5 max-w-[42ch] text-[14px] leading-relaxed text-ink-soft">
                {description}
            </p>
            {action && <div className="mt-6 flex justify-center">{action}</div>}
        </div>
    )
}

/** Thin spinner used while a page boots. */
export function Spinner({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-block h-4 w-4 animate-spin rounded-full border border-line-strong border-t-ink ${className}`}
        />
    )
}
