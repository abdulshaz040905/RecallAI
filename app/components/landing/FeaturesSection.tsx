import { Reveal } from '../motion/reveal'
import { SplitText } from '../motion/split-text'
import { SectionLabel } from './parts'

const features = [
    {
        title: 'Auto-joins every call',
        body: 'Connect Google Calendar once. The bot shows up to Zoom, Meet and Teams calls on its own — and you can toggle it off for anything private.',
        meta: 'Calendar'
    },
    {
        title: 'Summaries the moment you hang up',
        body: 'Gemini writes the recap, pulls out the decisions and drafts the action-item list before you have closed the tab.',
        meta: 'Gemini'
    },
    {
        title: 'A hundred languages, one dropdown',
        body: 'Flip any transcript into 100+ languages. Translations are cached, so the second read is instant.',
        meta: 'Translate'
    },
    {
        title: 'Search everything you have ever said',
        body: 'Full-text and semantic search across every transcript and summary — filtered by date, duration or who was in the room.',
        meta: 'Search'
    },
    {
        title: 'Chat with your meeting history',
        body: 'Ask about one call or all of them. Every answer cites the meetings it came from, so you can check the source.',
        meta: 'RAG'
    },
    {
        title: 'Action items that actually land',
        body: 'Push tasks to Notion, Linear, Jira, Trello, Salesforce or Slack in a single click',
        meta: 'Routing'
    },
    {
        title: 'Workspaces with real roles',
        body: 'Invite teammates as owner, admin, member or viewer. Recordings stay scoped to the people who should see them.',
        meta: 'Teams'
    }
]

export default function FeaturesSection() {
    return (
        <section id="features" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
                {/* Sticky column: the section holds its own heading while the
                    list scrolls past it. */}
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <Reveal direction="fade">
                        <SectionLabel index="01">Capabilities</SectionLabel>
                    </Reveal>

                    <SplitText
                        as="h2"
                        className="display mt-7 text-[clamp(2.1rem,5vw,3.75rem)]"
                        stagger={40}
                    >
                        {['Everything after', 'the call, handled.']}
                    </SplitText>

                    <Reveal direction="up" delay={120}>
                        <p className="mt-6 max-w-[38ch] text-[15px] leading-[1.65] text-ink-soft">
                            Recording, transcription, translation, search, summaries and task
                            routing — without stitching five subscriptions together.
                        </p>
                    </Reveal>
                </div>

                <div>
                    {features.map((feature, i) => (
                        <Reveal
                            key={feature.title}
                            direction="up"
                            delay={i * 55}
                            className="group border-t border-line last:border-b"
                        >
                            <div className="flex gap-5 py-8 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-9 sm:group-hover:pl-3">
                                <span className="w-7 shrink-0 pt-1.5 font-mono text-[11px] tabular-nums text-ink-faint">
                                    {String(i + 1).padStart(2, '0')}
                                </span>

                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-6">
                                        <h3 className="font-display text-[clamp(1.25rem,2.4vw,1.85rem)] font-medium leading-[1.15] tracking-[-0.03em]">
                                            {feature.title}
                                        </h3>
                                        <span className="mt-2 hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint sm:block">
                                            {feature.meta}
                                        </span>
                                    </div>
                                    <p className="mt-3 max-w-[52ch] text-[14px] leading-[1.7] text-ink-soft">
                                        {feature.body}
                                    </p>
                                </div>
                            </div>

                            {/* Hairline that fills in from the left on hover. */}
                            <div className="h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    )
}
