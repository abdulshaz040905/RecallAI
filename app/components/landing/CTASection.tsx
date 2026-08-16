'use client'

import { SignUpButton, useUser } from '@clerk/nextjs'
import { Marquee } from '../motion/marquee'
import { Reveal } from '../motion/reveal'
import { SplitText } from '../motion/split-text'
import { Action, ArrowMark } from './parts'

export default function CTASection() {
    const { isSignedIn } = useUser()

    return (
        <section className="ink-block noise relative overflow-hidden">
            <div className="relative mx-auto max-w-[1400px] px-5 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-32">
                <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
                    <SplitText
                        as="h2"
                        className="display-tight max-w-[13ch] text-[clamp(2.75rem,8vw,7rem)] text-paper"
                        stagger={50}
                    >
                        {['Stop taking', 'notes.']}
                    </SplitText>

                    <Reveal direction="up" delay={140} className="lg:pb-4">
                        <p className="max-w-[34ch] text-[15px] leading-[1.65] text-paper/60">
                            Two minutes to set up. Your next meeting writes itself up while
                            you actually pay attention to it.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {isSignedIn ? (
                                <Action href="/home" tone="paper" size="lg">
                                    Open dashboard
                                    <ArrowMark />
                                </Action>
                            ) : (
                                <SignUpButton mode="modal">
                                    <span>
                                        <Action tone="paper" size="lg">
                                            Get started free
                                            <ArrowMark />
                                        </Action>
                                    </span>
                                </SignUpButton>
                            )}
                            <Action
                                href="#pricing"
                                size="lg"
                                className="border border-paper/25 text-paper hover:bg-paper hover:text-ink"
                            >
                                Compare plans
                            </Action>
                        </div>
                    </Reveal>
                </div>
            </div>

            {/* Giant wordmark bleeding off both edges. */}
            <div className="pointer-events-none select-none pb-6 opacity-[0.13]">
                <Marquee duration={40} bleed>
                    <span className="shrink-0 pr-14 font-display text-[16vw] leading-[0.85] tracking-[-0.05em] text-paper">
                        Recall AI —
                    </span>
                </Marquee>
            </div>
        </section>
    )
}
