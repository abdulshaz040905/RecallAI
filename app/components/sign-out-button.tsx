'use client'

import { useState, type ReactNode } from 'react'
import { useClerk } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SignOutButtonProps {
    /**
     * `button` uses the shared Button component (app chrome).
     * `link` matches the marketing nav's mono text links.
     */
    appearance?: 'button' | 'link'
    variant?: 'default' | 'outline' | 'ghost' | 'secondary'
    size?: 'default' | 'sm' | 'lg'
    /** Where to land once the session is cleared. */
    redirectTo?: string
    showIcon?: boolean
    className?: string
    children?: ReactNode
}

/**
 * Sign out, driven by `useClerk().signOut` rather than Clerk's <SignOutButton>.
 *
 * Two reasons this is the reliable shape:
 *  - No child cloning. Clerk's <SignOutButton> injects onClick into whatever you
 *    nest inside it; anything that swallows or overrides props breaks it silently.
 *  - An explicit `redirectUrl`. Without one you sign out while still standing on a
 *    protected route, and the redirect is left to middleware — which reads to the
 *    user as "the button did nothing".
 */
export function SignOutButton({
    appearance = 'button',
    variant = 'outline',
    size = 'default',
    redirectTo = '/',
    showIcon = true,
    className,
    children
}: SignOutButtonProps) {
    const { signOut } = useClerk()
    const [pending, setPending] = useState(false)

    const handleSignOut = async () => {
        if (pending) return
        setPending(true)

        try {
            await signOut({ redirectUrl: redirectTo })
        } catch (error) {
            // Only reset on failure — a successful sign-out navigates away and
            // unmounts this component.
            console.error('sign out failed:', error)
            setPending(false)
        }
    }

    const label = pending ? 'Signing out…' : (children ?? 'Sign out')

    if (appearance === 'link') {
        return (
            <button
                type="button"
                onClick={handleSignOut}
                disabled={pending}
                className={cn(
                    'link-underline cursor-pointer px-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink disabled:opacity-40',
                    className
                )}
            >
                {label}
            </button>
        )
    }

    return (
        <Button
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            variant={variant}
            size={size}
            className={className}
        >
            {showIcon && <LogOut className="h-3.5 w-3.5" strokeWidth={1.6} />}
            {label}
        </Button>
    )
}
