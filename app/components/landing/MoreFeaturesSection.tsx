import { Reveal } from '../motion/reveal'
import { SplitText } from '../motion/split-text'
import { SectionLabel } from './parts'

const items = [
    'Recording playback',
    'Summary emails',
    'Date & duration filters',
    'Participant filters',
    'Multiple workspaces',
    'Role-based access',
    'Custom bot avatar',
    'Slack notifications',
    'Per-meeting bot toggle',
    'Cached translations',
    'Semantic RAG search',
    'Webhook processing'
]

export default function MoreFeaturesSection() {
    return (
        <section className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 sm:pb-32">
            <div className="border-t border-line pt-16">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
                    <div>
                        <Reveal direction="fade">
                            <SectionLabel index="04">Details</SectionLabel>
                        </Reveal>
                        <SplitText
                            as="h2"
                            className="display mt-7 text-[clamp(1.9rem,4vw,3rem)]"
                            stagger={40}
                        >
                            {['The small things', 'add up.']}
                        </SplitText>
                    </div>

                    <div className="flex flex-wrap gap-2 self-center">
                        {items.map((item, i) => (
                            <Reveal
                                key={item}
                                direction="scale"
                                delay={i * 35}
                                as="span"
                                className="inline-block"
                            >
                                <span className="inline-flex cursor-default items-center rounded-full border border-line px-4 py-2 text-[13px] text-ink-soft transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper">
                                    {item}
                                </span>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
