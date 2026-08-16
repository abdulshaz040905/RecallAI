'use client'

import { PricingPlans } from '../components/pricing-plans'
import { PageBody, PageHeader } from '../components/page-shell'

export default function Pricing() {
    return (
        <>
            <PageHeader
                eyebrow="Plans"
                title="Pick a plan"
                description="Automatic summaries, action items and search for every meeting. Cancel whenever."
            />

            <PageBody>
                <PricingPlans />

                <p className="mt-10 border-t border-line pt-6 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    Billed monthly in INR · GST calculated at checkout · Cancel anytime
                </p>
            </PageBody>
        </>
    )
}
