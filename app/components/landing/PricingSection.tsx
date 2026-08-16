import { Reveal } from '../motion/reveal'
import { SplitText } from '../motion/split-text'
import { PricingPlans } from '../pricing-plans'
import { SectionLabel } from './parts'

/**
 * The pricing block on the landing page.
 *
 * Shares `PricingPlans` with the /pricing route, so the two are the same UI by
 * construction. The `id` is what the nav's "Pricing" link scrolls to.
 */
export default function PricingSection() {
    return (
        <section
            id="pricing"
            className="mx-auto max-w-[1400px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32"
        >
            <div className="border-t border-line pt-16">
                <div className="mb-12 grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
                    <div>
                        <Reveal direction="fade">
                            <SectionLabel index="05">Pricing</SectionLabel>
                        </Reveal>
                        <SplitText
                            as="h2"
                            className="display mt-7 text-[clamp(2.1rem,5vw,3.75rem)]"
                            stagger={40}
                        >
                            {['Simple plans,', 'no surprises.']}
                        </SplitText>
                    </div>

                    <Reveal direction="up" delay={100} className="lg:self-center">
                        <p className="max-w-[42ch] text-[15px] leading-[1.65] text-ink-soft">
                            Start free — the bot joins, records and writes up your meetings
                            with no card required. Move up a tier when you need more of them.
                        </p>
                    </Reveal>
                </div>

                <Reveal direction="up">
                    <PricingPlans />
                </Reveal>

                <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    Billed monthly in INR · GST calculated at checkout · Cancel anytime
                </p>
            </div>
        </section>
    )
}
