'use client'

import { Bot, Home, Layers3, Search, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
    { title: 'Home', url: '/home', icon: Home },
    { title: 'Search', url: '/search', icon: Search },
    { title: 'Chat', url: '/chat', icon: Bot },
    { title: 'Teams', url: '/workspaces', icon: Users },
    { title: 'Apps', url: '/integrations', icon: Layers3 }
]

/** Bottom bar on small viewports. */
export function MobileNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur-xl md:hidden">
            <div className="flex items-stretch">
                {items.map((item) => {
                    const isActive =
                        pathname === item.url || pathname.startsWith(`${item.url}/`)

                    return (
                        <Link
                            key={item.title}
                            href={item.url}
                            aria-label={item.title}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'relative flex flex-1 flex-col items-center gap-1 py-3 transition-colors',
                                isActive ? 'text-ink' : 'text-ink-faint'
                            )}
                        >
                            {/* Active marker sits on the top rule. */}
                            <span
                                className={cn(
                                    'absolute inset-x-4 top-0 h-px origin-center bg-ink transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]',
                                    isActive ? 'scale-x-100' : 'scale-x-0'
                                )}
                            />
                            <item.icon className="h-[17px] w-[17px]" strokeWidth={1.6} />
                            <span className="font-mono text-[9px] uppercase tracking-[0.08em]">
                                {item.title}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
