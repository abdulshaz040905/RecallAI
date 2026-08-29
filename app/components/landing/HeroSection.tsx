'use client'

import { SignUpButton, useUser } from '@clerk/nextjs'
import { Marquee } from '../motion/marquee'
import { Parallax } from '../motion/parallax'
import { Reveal } from '../motion/reveal'
import { SplitText } from '../motion/split-text'
import { Action, ArrowMark } from './parts'

const specs = [
    ['Platforms', 'Zoom · Meet · Teams'],
    ['Languages', '100+ transcript locales'],
    ['Turnaround', 'Under two minutes'],
    ['Routing', '8 task destinations']
]

const ticker = [
    'Record',
    'Transcribe',
    'Translate',
    'Summarise',
    'Assign',
    'Search',
    'Recall'
]

/** A still of the product, rendered in the same design language as the page. */
function ProductPlate() {
    return (
        <div className="overflow-hidden rounded-[18px] border border-line bg-card">
            {/* Window chrome */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-vermilion live-dot" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        Recording · Product sync
                    </span>
                </div>
                <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                    00:42:18
                </span>
            </div>

            <div className="grid md:grid-cols-[1.25fr_1fr]">
                {/* Summary column */}
                <div className="border-b border-line p-6 md:border-b-0 md:border-r sm:p-8">
                    <p className="eyebrow mb-4">Summary</p>
                    <p className="font-display text-[19px] leading-[1.35] tracking-[-0.02em] sm:text-[22px]">
                        The team agreed to ship the new onboarding flow on Thursday, pause
                        the pricing test until Q3, and move the design review to Monday
                        morning.
                    </p>

                    <div className="mt-7 space-y-3.5">
                        {[
                            ['Maya', 'Ship it Thursday — the flag is already live.'],
                            ['Dev', 'Pricing test can wait. It muddies the numbers.'],
                            ['Ana', "I'll move the review to Monday 9am."]
                        ].map(([who, line]) => (
                            <div key={who} className="flex gap-3.5">
                                <span className="w-12 shrink-0 pt-[3px] font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                                    {who}
                                </span>
                                <span className="text-[13px] leading-relaxed text-ink-soft">
                                    {line}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action items column */}
                <div className="p-6 sm:p-8">
                    <p className="eyebrow mb-4">Action items</p>
                    <ul>
                        {[
                            ['Ship onboarding flow', 'Linear', true],
                            ['Pause pricing test', 'Notion', true],
                            ['Book design review', 'Jira', false],
                            ['Send recap to #product', 'Slack', false]
                        ].map(([label, target, done]) => (
                            <li
                                key={label as string}
                                className="flex items-start gap-3 border-b border-line py-3 last:border-0"
                            >
                                <span
                                    className={`mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
                                        done
                                            ? 'border-ink bg-ink'
                                            : 'border-line-strong bg-transparent'
                                    }`}
                                >
                                    {done ? (
                                        <svg
                                            viewBox="0 0 10 10"
                                            className="h-2 w-2"
                                            fill="none"
                                            aria-hidden
                                        >
                                            <path
                                                d="M1.5 5.2L3.8 7.5L8.5 2.5"
                                                stroke="var(--paper)"
                                                strokeWidth="1.6"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    ) : null}
                                </span>
                                <span className="flex-1">
                                    <span
                                        className={`block text-[13px] leading-snug ${
                                            done ? 'text-ink-faint line-through' : 'text-ink'
                                        }`}
                                    >
                                        {label as string}
                                    </span>
                                </span>
                                <span className="mt-[1px] font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                                    {target as string}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default function HeroSection() {
    const { isSignedIn } = useUser()

    return (
        <section id="hero" className="relative overflow-hidden">
            <div className="grid-backdrop pointer-events-none absolute inset-x-0 top-0 h-[70vh]" />

            <div className="relative mx-auto max-w-[1400px] px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
                <Reveal direction="fade" className="mb-10 flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-vermilion live-dot" />
                    <span className="eyebrow">
                        Meeting intelligence · Powered by Gemini
                    </span>
                </Reveal>

                <SplitText
                    as="h1"
                    className="display-tight max-w-[15ch] text-[clamp(2.9rem,9.5vw,8.75rem)]"
                    stagger={55}
                >
                    {['Meetings that', 'write themselves']}
                </SplitText>

                {/* Second line carries the serif accent, so it is split by hand. */}
                <Reveal direction="up" delay={340}>
                    <h2 className="display-tight text-[clamp(2.9rem,9.5vw,8.75rem)]">
                        <span className="serif-accent pr-[0.08em]">up.</span>
                    </h2>
                </Reveal>

                <div className="mt-14 grid gap-12 border-t border-line pt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
                    <Reveal direction="up" delay={80}>
                        <p className="max-w-[46ch] text-[17px] leading-[1.6] text-ink-soft sm:text-[19px]">
                            Recall joins your calls, records and transcribes them, then hands
                            back the summary, the decisions and every action item — routed
                            straight into the tools your team already uses.
                        </p>

                        <div className="mt-9 flex flex-wrap items-center gap-3">
                            {isSignedIn ? (
                                <Action href="/home" size="lg">
                                    Open dashboard
                                    <ArrowMark />
                                </Action>
                            ) : (
                                <SignUpButton mode="modal">
                                    <span>
                                        <Action size="lg">
                                            Start free
                                            <ArrowMark />
                                        </Action>
                                    </span>
                                </SignUpButton>
                            )}
                            <Action href="#features" tone="outline" size="lg">
                                See how it works
                            </Action>
                        </div>

                        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                            No card required · Free tier included
                        </p>
                    </Reveal>

                    {/* Spec table — the detail that makes a page feel designed. */}
                    <Reveal direction="up" delay={160}>
                        <dl>
                            {specs.map(([term, value], i) => (
                                <div
                                    key={term}
                                    className="flex items-baseline justify-between gap-6 border-b border-line py-3.5 first:border-t"
                                >
                                    <dt className="flex items-baseline gap-3">
                                        <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                                            {term}
                                        </span>
                                    </dt>
                                    <dd className="text-right text-[14px] text-ink">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </Reveal>
                </div>
            </div>

            {/* Product still, drifting slightly against the scroll. */}
            <div className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8">
                <Reveal direction="scale" delay={60}>
                    <Parallax distance={48}>
                        <ProductPlate />
                    </Parallax>
                </Reveal>
            </div>

            {/* Endless verb ticker. */}
            <div className="border-y border-line bg-paper-2/60 py-5">
                <Marquee duration={34} bleed>
                    {ticker.map((word) => (
                        <span
                            key={word}
                            className="flex shrink-0 items-center gap-8 pr-8 font-display text-[clamp(1.6rem,3.4vw,2.75rem)] tracking-[-0.03em] text-ink"
                        >
                            {word}
                            <span className="h-1.5 w-1.5 rounded-full bg-vermilion" />
                        </span>
                    ))}
                </Marquee>
            </div>
        </section>
    )
}
