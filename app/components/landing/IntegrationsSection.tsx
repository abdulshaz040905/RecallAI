import Image from 'next/image'
import { Marquee } from '../motion/marquee'
import { Reveal } from '../motion/reveal'
import { SplitText } from '../motion/split-text'
import { SectionLabel } from './parts'

const integrations = [
    { name: 'Notion', logo: '/notion.svg' },
    { name: 'Linear', logo: '/linear.svg' },
    { name: 'Salesforce', logo: '/salesforce.svg' },
    { name: 'HubSpot', logo: '/hubspot.svg' },
    { name: 'Jira', logo: '/jira.png' },
    { name: 'Asana', logo: '/asana.png' },
    { name: 'Trello', logo: '/trello.png' },
    { name: 'Slack', logo: '/slack.png' },
    { name: 'Google Calendar', logo: '/gcal.png' }
]

function LogoRow() {
    return (
        <>
            {integrations.map((integration) => (
                <span
                    key={integration.name}
                    className="flex shrink-0 items-center gap-3 border-r border-line px-9 py-6"
                >
                    <span className="relative h-6 w-6">
                        <Image
                            src={integration.logo}
                            alt=""
                            fill
                            sizes="24px"
                            className="object-contain"
                        />
                    </span>
                    <span className="whitespace-nowrap font-display text-[17px] tracking-[-0.02em] text-ink-soft">
                        {integration.name}
                    </span>
                </span>
            ))}
        </>
    )
}

export default function IntegrationsSection() {
    return (
        <section id="integrations" className="py-24 sm:py-32">
            <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
                    <div>
                        <Reveal direction="fade">
                            <SectionLabel index="03">Integrations</SectionLabel>
                        </Reveal>

                        <SplitText
                            as="h2"
                            className="display mt-7 text-[clamp(2.1rem,5vw,3.75rem)]"
                            stagger={40}
                        >
                            {['Follow-ups go', 'where you work.']}
                        </SplitText>
                    </div>

                    <Reveal direction="up" delay={100} className="lg:pt-16">
                        <p className="max-w-[42ch] text-[15px] leading-[1.65] text-ink-soft">
                            Connect a tool once. From then on any action item can be sent to
                            it without leaving the meeting page — with the assignee, the due
                            date and a link back to the moment it was agreed.
                        </p>
                    </Reveal>
                </div>
            </div>

            {/* Two counter-scrolling logo rails. */}
            <div className="mt-16 border-y border-line">
                <Marquee duration={44} bleed>
                    <LogoRow />
                </Marquee>
            </div>
            {/* <div className="border-b border-line">
                <Marquee duration={52} direction="right" bleed>
                    <LogoRow />
                </Marquee>
            </div> */}
        </section>
    )
}
