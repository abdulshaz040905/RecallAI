'use client'

import {
    Bot,
    DollarSign,
    Home,
    Layers3,
    Search,
    Settings,
    Users
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useUsage } from '../contexts/UsageContext'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { WorkspaceSwitcher } from './workspace-switcher'

const items = [
    { title: 'Home', url: '/home', icon: Home },
    { title: 'Search', url: '/search', icon: Search },
    { title: 'Chat with AI', url: '/chat', icon: Bot },
    { title: 'Workspaces', url: '/workspaces', icon: Users },
    { title: 'Integrations', url: '/integrations', icon: Layers3 },
    { title: 'Settings', url: '/settings', icon: Settings },
    { title: 'Pricing', url: '/pricing', icon: DollarSign }
]

function UsageMeter({
    label,
    used,
    limit
}: {
    label: string
    used: number
    limit: number
}) {
    const unlimited = limit === -1
    const progress = unlimited ? 0 : Math.min((used / Math.max(limit, 1)) * 100, 100)
    const nearLimit = !unlimited && progress >= 80

    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    {label}
                </span>
                <span
                    className={cn(
                        'font-mono text-[11px] tabular-nums',
                        nearLimit ? 'text-vermilion' : 'text-ink'
                    )}
                >
                    {used}/{unlimited ? '∞' : limit}
                </span>
            </div>

            {!unlimited && (
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-line">
                    <div
                        className={cn(
                            'h-full rounded-full transition-[width] duration-700 ease-out',
                            nearLimit ? 'bg-vermilion' : 'bg-ink'
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    )
}

export function AppSidebar() {
    const pathname = usePathname()
    const { usage, limits } = useUsage()

    const getUpgradeInfo = () => {
        if (!usage) return null

        switch (usage.currentPlan) {
            case 'free':
                return {
                    title: 'Upgrade to Starter',
                    description: '10 meetings a month and 30 daily chats.',
                    showButton: true
                }
            case 'starter':
                return {
                    title: 'Upgrade to Pro',
                    description: '30 meetings a month and 100 daily chats.',
                    showButton: true
                }
            case 'pro':
                return {
                    title: 'Go Premium',
                    description: 'Unlimited meetings and chat messages.',
                    showButton: true
                }
            case 'premium':
                return {
                    title: "You're on Premium",
                    description: 'Unlimited access to everything.',
                    showButton: false
                }
            default:
                return {
                    title: 'Upgrade your plan',
                    description: 'Unlock more meetings and integrations.',
                    showButton: true
                }
        }
    }

    const upgradeInfo = getUpgradeInfo()

    return (
        <aside className="hidden h-screen w-[264px] shrink-0 flex-col border-r border-line bg-card md:flex">
            {/* Brand */}
            <Link
                href="/"
                className="flex items-center gap-2.5 border-b border-line px-5 py-[19px]"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink font-display text-[13px] font-semibold text-paper">
                    R
                </span>
                <span className="leading-tight">
                    <span className="block font-display text-[15px] font-medium tracking-[-0.03em]">
                        Recall
                    </span>
                    <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                        Meeting intelligence
                    </span>
                </span>
            </Link>

            <div className="px-3 pt-3">
                <WorkspaceSwitcher />
            </div>

            {/* Nav */}
            <nav className="no-scrollbar mt-4 flex-1 overflow-y-auto px-3">
                <p className="eyebrow mb-2 px-2">Menu</p>
                {items.map((item) => {
                    const isActive =
                        pathname === item.url || pathname.startsWith(`${item.url}/`)

                    return (
                        <Link
                            key={item.title}
                            href={item.url}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13.5px] transition-colors duration-200',
                                isActive
                                    ? 'bg-ink text-paper'
                                    : 'text-ink-soft hover:bg-paper-2 hover:text-ink'
                            )}
                        >
                            <item.icon className="h-[15px] w-[15px]" strokeWidth={1.6} />
                            <span className="font-medium tracking-[-0.01em]">
                                {item.title}
                            </span>
                            {isActive && (
                                <span className="ml-auto h-1 w-1 rounded-full bg-vermilion" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Usage + upgrade */}
            <div className="space-y-3 border-t border-line p-3">
                {usage && (
                    <div className="rounded-[10px] border border-line p-3.5">
                        <div className="mb-3.5 flex items-center justify-between">
                            <span className="eyebrow">Usage</span>
                            <span className="pill pill-info">
                                {usage.currentPlan.toUpperCase()}
                            </span>
                        </div>

                        <div className="space-y-3.5">
                            <UsageMeter
                                label="Meetings"
                                used={usage.meetingsThisMonth}
                                limit={limits.meetings}
                            />
                            <UsageMeter
                                label="Chat"
                                used={usage.chatMessagesToday}
                                limit={limits.chatMessages}
                            />
                        </div>
                    </div>
                )}

                {upgradeInfo && (
                    <div className="rounded-[10px] bg-ink p-3.5 text-paper">
                        <p className="font-display text-[14px] font-medium tracking-[-0.02em]">
                            {upgradeInfo.title}
                        </p>
                        <p className="mt-1 text-[12px] leading-relaxed text-paper/60">
                            {upgradeInfo.description}
                        </p>

                        {upgradeInfo.showButton ? (
                            <Link
                                href="/pricing"
                                className="mt-3 flex h-8 w-full items-center justify-center rounded-full bg-paper text-[12px] font-medium text-ink transition-colors hover:bg-white"
                            >
                                View plans
                            </Link>
                        ) : (
                            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-paper/45">
                                Thanks for the support
                            </p>
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}
