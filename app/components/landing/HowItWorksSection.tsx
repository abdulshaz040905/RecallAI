import { Marquee } from '../motion/marquee'
import { Reveal } from '../motion/reveal'
import { SplitText } from '../motion/split-text'
import { SectionLabel } from './parts'

const steps = [
    {
        title: 'Connect your calendar',
        body: 'One OAuth click and Recall sees your upcoming calls. Toggle the bot off for anything you would rather keep off the record.'
    },
    {
        title: 'The bot joins and records',
        body: 'It appears in Zoom, Meet or Teams under a name and avatar you choose, then captures the audio and who said what.'
    },
    {
        title: 'Gemini writes it up',
        body: 'Minutes later: a transcript, a summary, the decisions that were made and a clean action-item list, in your inbox.'
    },
    {
        title: 'Ship the follow-ups',
        body: 'Push tasks into Notion, Linear, Jira, Salesforce or Slack — or just ask the AI what you missed while you were talking.'
    }
]

export default function HowItWorksSection() {
    return (
        <section id="how-it-works" className="ink-block noise relative overflow-hidden">
            {/* Oversized word running behind the content. */}
            <div className="pointer-events-none absolute inset-x-0 top-8 opacity-[0.055]">
                <Marquee duration={52} bleed>
                    <span className="shrink-0 pr-12 font-display text-[13vw] leading-none tracking-[-0.05em] text-paper">
                        How it works —
                    </span>
                </Marquee>
            </div>

            <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
                <Reveal direction="fade">
                    <SectionLabel index="02">Process</SectionLabel>
                </Reveal>

                <SplitText
                    as="h2"
                    className="display mt-7 max-w-[16ch] text-[clamp(2.1rem,5.5vw,4.25rem)] text-paper"
                    stagger={40}
                >
                    {['Set it up once,', 'then forget it exists.']}
                </SplitText>

                <div className="mt-16 grid gap-px border-t border-paper/15 sm:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step, i) => (
                        <Reveal
                            key={step.title}
                            direction="up"
                            delay={i * 90}
                            className="group relative pt-8 lg:pr-8"
                        >
                            {/* Vertical rule between columns on wide screens. */}
                            {i > 0 && (
                                <span className="absolute -left-px top-0 hidden h-full w-px bg-paper/12 lg:block" />
                            )}

                            <div className="flex items-baseline gap-3">
                                <span className="font-mono text-[11px] tabular-nums text-paper/45">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="h-px flex-1 origin-left scale-x-0 bg-paper/40 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                            </div>

                            <h3 className="mt-6 font-display text-[22px] font-medium leading-[1.15] tracking-[-0.03em] text-paper">
                                {step.title}
                            </h3>
                            <p className="mt-3.5 max-w-[34ch] pb-10 text-[14px] leading-[1.7] text-paper/60">
                                {step.body}
                            </p>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    )
}
