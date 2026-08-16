'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { ROLE_LABELS } from '@/lib/workspace/rbac'
import { format } from 'date-fns'
import { EmptyState, PageBody, PageHeader } from '../components/page-shell'

export default function WorkspacesPage() {
    const router = useRouter()
    const { workspaces, activeWorkspaceId, loading, createWorkspace, switchWorkspace } =
        useWorkspaces()

    const [creating, setCreating] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [name, setName] = useState('')
    const [about, setAbout] = useState('')

    const handleCreate = async () => {
        if (name.trim().length < 2) {
            toast.error('Give your workspace a name of at least 2 characters')
            return
        }

        setCreating(true)
        try {
            await createWorkspace(name.trim(), about.trim() || undefined)
            toast.success(`${name.trim()} is ready`)
            setName('')
            setAbout('')
            setShowForm(false)
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Could not create workspace'
            )
        } finally {
            setCreating(false)
        }
    }

    return (
        <>
            <PageHeader
                eyebrow="Teams"
                title="Workspaces"
                description="Group meetings by team or client, invite people, and control what each person can see."
                actions={
                    <Button onClick={() => setShowForm((value) => !value)}>
                        <Plus className="h-4 w-4" strokeWidth={1.8} />
                        New workspace
                    </Button>
                }
            />

            <PageBody className="max-w-[1000px]">
                {showForm && (
                    <div className="mb-10 border-b border-line pb-10">
                        <p className="eyebrow mb-5">Create a workspace</p>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="ws-name" className="text-[13px]">
                                    Name
                                </Label>
                                <Input
                                    id="ws-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Acme Product Team"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ws-about" className="text-[13px]">
                                    Description (optional)
                                </Label>
                                <Input
                                    id="ws-about"
                                    value={about}
                                    onChange={(event) => setAbout(event.target.value)}
                                    placeholder="Weekly product syncs and customer calls"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex gap-2">
                            <Button onClick={handleCreate} disabled={creating}>
                                {creating ? 'Creating…' : 'Create workspace'}
                            </Button>
                            <Button variant="ghost" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-24 animate-pulse rounded-[10px] border border-line bg-paper-2"
                            />
                        ))}
                    </div>
                ) : workspaces.length === 0 ? (
                    <EmptyState
                        title="No workspaces yet"
                        description="Create one to start sharing meeting recordings, transcripts and action items with your team."
                        action={
                            <Button onClick={() => setShowForm(true)}>
                                <Plus className="h-4 w-4" strokeWidth={1.8} />
                                Create your first workspace
                            </Button>
                        }
                    />
                ) : (
                    <ul>
                        {workspaces.map((workspace, i) => (
                            <li key={workspace.id} className="border-b border-line first:border-t">
                                <div className="group flex items-start gap-5 py-5">
                                    <span className="w-6 shrink-0 pt-1.5 font-mono text-[10px] tabular-nums text-ink-faint">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => router.push(`/workspaces/${workspace.id}`)}
                                        className="min-w-0 flex-1 cursor-pointer text-left"
                                    >
                                        <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                            <span className="font-display text-[18px] font-medium tracking-[-0.025em]">
                                                {workspace.name}
                                            </span>
                                            <span className="pill pill-info">
                                                {ROLE_LABELS[workspace.role]}
                                            </span>
                                            {workspace.id === activeWorkspaceId && (
                                                <span className="pill pill-success">Active</span>
                                            )}
                                        </span>

                                        {workspace.about && (
                                            <span className="mt-1.5 line-clamp-1 block text-[13px] text-ink-soft">
                                                {workspace.about}
                                            </span>
                                        )}

                                        <span className="mt-2.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                                            {workspace.memberCount} member
                                            {workspace.memberCount === 1 ? '' : 's'} ·{' '}
                                            {workspace.meetingCount} meeting
                                            {workspace.meetingCount === 1 ? '' : 's'} · created{' '}
                                            {format(new Date(workspace.createdAt), 'd MMM yyyy')}
                                        </span>
                                    </button>

                                    <div className="flex shrink-0 items-center gap-3 self-center">
                                        {workspace.id !== activeWorkspaceId && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    switchWorkspace(workspace.id).catch(() =>
                                                        toast.error('Could not switch workspace')
                                                    )
                                                }
                                                className="link-underline cursor-pointer font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink"
                                            >
                                                Set active
                                            </button>
                                        )}
                                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                            Open →
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </PageBody>
        </>
    )
}
