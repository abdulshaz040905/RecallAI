'use client'

import { Check, ChevronsUpDown, Plus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { ROLE_LABELS } from '@/lib/workspace/rbac'

/** Compact workspace picker that sits under the brand in the sidebar. */
export function WorkspaceSwitcher() {
    const router = useRouter()
    const { workspaces, activeWorkspace, loading, switchWorkspace } = useWorkspaces()
    const [open, setOpen] = useState(false)

    const handleSwitch = async (workspaceId: string) => {
        try {
            await switchWorkspace(workspaceId)
            setOpen(false)
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Could not switch workspace'
            )
        }
    }

    if (loading) {
        return (
            <div className="h-[52px] animate-pulse rounded-[10px] border border-line bg-paper-2" />
        )
    }

    if (workspaces.length === 0) {
        return (
            <button
                type="button"
                onClick={() => router.push('/workspaces')}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-dashed border-line-strong px-3 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-paper-2">
                    <Plus className="h-3.5 w-3.5" />
                </span>
                Create a workspace
            </button>
        )
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-line px-3 py-2.5 text-left transition-colors hover:bg-paper-2"
                >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink font-mono text-[10px] font-semibold text-paper">
                        {(activeWorkspace?.name ?? 'W').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium tracking-[-0.01em]">
                            {activeWorkspace?.name ?? 'Select workspace'}
                        </span>
                        <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                            {activeWorkspace ? ROLE_LABELS[activeWorkspace.role] : 'None selected'}
                        </span>
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64 rounded-[12px]">
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    Your workspaces
                </DropdownMenuLabel>

                {workspaces.map((workspace) => (
                    <DropdownMenuItem
                        key={workspace.id}
                        onSelect={() => handleSwitch(workspace.id)}
                        className="cursor-pointer gap-2.5 rounded-lg py-2"
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink font-mono text-[9px] font-semibold text-paper">
                            {workspace.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px]">{workspace.name}</span>
                            <span className="block text-[11px] text-ink-faint">
                                {workspace.memberCount} member
                                {workspace.memberCount === 1 ? '' : 's'} ·{' '}
                                {ROLE_LABELS[workspace.role]}
                            </span>
                        </span>
                        <Check
                            className={cn(
                                'h-3.5 w-3.5 shrink-0',
                                workspace.id === activeWorkspace?.id
                                    ? 'opacity-100 text-vermilion'
                                    : 'opacity-0'
                            )}
                        />
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onSelect={() => router.push('/workspaces')}
                    className="cursor-pointer gap-2.5 rounded-lg"
                >
                    <Users className="h-3.5 w-3.5" />
                    Manage workspaces
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
