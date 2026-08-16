import { Counter } from '../motion/counter'
import { Reveal } from '../motion/reveal'

const stats: {
    value: number
    prefix?: string
    suffix?: string
    decimals?: number
    label: string
}[] = [
    { value: 100, suffix: '+', label: 'Transcript languages' },
    { value: 8, label: 'Task destinations' },
    { value: 2, prefix: '<', suffix: ' min', label: 'Call end to summary' },
    { value: 0, prefix: '$', label: 'AI cost on the free tier' }
]

export default function StatsSection() {
    return (
        <section className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 sm:pb-32">
            <div className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <Reveal
                        key={stat.label}
                        direction="up"
                        delay={i * 80}
                        className="relative border-b border-line py-10 sm:border-b-0 lg:pr-8"
                    >
                        {i > 0 && (
                            <span className="absolute left-0 top-0 hidden h-full w-px bg-line lg:block" />
                        )}

                        <div className={i > 0 ? 'lg:pl-8' : ''}>
                            <div className="display text-[clamp(2.75rem,6vw,4.5rem)] tabular-nums">
                                <Counter
                                    to={stat.value}
                                    prefix={stat.prefix}
                                    suffix={stat.suffix}
                                    decimals={stat.decimals ?? 0}
                                />
                            </div>
                            <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                                {stat.label}
                            </div>
                        </div>
                    </Reveal>
                ))}
            </div>
        </section>
    )
}
