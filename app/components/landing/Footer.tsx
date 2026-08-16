import Link from 'next/link'
import { Reveal } from '../motion/reveal'
import { Wordmark } from './parts'

const columns = [
    {
        title: 'Product',
        links: [
            { label: 'Features', href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Integrations', href: '#integrations' },
            { label: 'Pricing', href: '#pricing' }
        ]
    },
    {
        title: 'App',
        links: [
            { label: 'Dashboard', href: '/home' },
            { label: 'Search meetings', href: '/search' },
            { label: 'Workspaces', href: '/workspaces' },
            { label: 'Chat with AI', href: '/chat' }
        ]
    },
    {
        title: 'Account',
        links: [
            { label: 'Settings', href: '/settings' },
            { label: 'Sign in', href: '/sign-in' },
            { label: 'Sign up', href: '/sign-up' }
        ]
    }
]

export default function Footer() {
    return (
        <footer className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8">
            <div className="grid gap-12 border-t border-line pt-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-16">
                <Reveal direction="up">
                    <Wordmark />
                    <p className="mt-4 max-w-[34ch] text-[14px] leading-[1.65] text-ink-soft">
                        Meeting intelligence that records, transcribes, translates and routes
                        your follow-ups automatically.
                    </p>
                </Reveal>

                {columns.map((column, i) => (
                    <Reveal key={column.title} direction="up" delay={(i + 1) * 70}>
                        <p className="eyebrow mb-5">{column.title}</p>
                        <ul className="space-y-3">
                            {column.links.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="link-underline text-[14px] text-ink-soft transition-colors hover:text-ink"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Reveal>
                ))}
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                <span>© {new Date().getFullYear()} Recall AI</span>
                <span>Next.js · Prisma · Google Gemini</span>
            </div>
        </footer>
    )
}
