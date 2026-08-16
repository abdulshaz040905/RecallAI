'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    ArrowLeft,
    Copy,
    LogOut,
    ShieldCheck,
    Trash2,
    UserPlus
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from '@/lib/workspace/rbac'
import { PageBody, SectionHeading, Spinner } from '../../components/page-shell'

interface Member {
    id: string
    userId: string
    role: Role
    joinedAt: string
    name: string | null
    email: string | null
    imageUrl: string | null
}

interface Invite {
    id: string
    email: string
    role: Role
    status: string
    expiresAt: string
    token: string
}

interface WorkspaceDetail {
    workspace: {
        id: string
        name: string
        slug: string
        about: string | null
        createdAt: string
        meetingCount: number
    }
    members: Member[]
    invites: Invite[]
    viewer: {
        role: Role
        assignableRoles: Role[]
        permissions: {
            canUpdate: boolean
            canDelete: boolean
            canInvite: boolean
            canRemoveMembers: boolean
            canChangeRoles: boolean
            canManageIntegrations: boolean
        }
    }
}

export default function WorkspaceDetailPage({
    params
}: {
    params: Promise<{ workspaceId: string }>
}) {
    const { workspaceId } = use(params)
    const router = useRouter()

    const [data, setData] = useState<WorkspaceDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<Role>('MEMBER')
    const [inviting, setInviting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}`)
            const payload = await response.json()

            if (!response.ok) {
                throw new Error(payload.error || 'Could not load workspace')
            }

            setData(payload)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not load workspace')
            router.push('/workspaces')
        } finally {
            setLoading(false)
        }
    }, [workspaceId, router])

    useEffect(() => {
        load()
    }, [load])

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            toast.error('Enter an email address')
            return
        }

        setInviting(true)
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
            })

            const payload = await response.json()

            if (!response.ok) {
                throw new Error(payload.error || 'Could not send invite')
            }

            toast.success(
                payload.emailSent
                    ? `Invite sent to ${inviteEmail.trim()}`
                    : 'Invite created — copy the link to share it'
            )

            if (!payload.emailSent && payload.inviteUrl) {
                await navigator.clipboard.writeText(payload.inviteUrl).catch(() => {})
            }

            setInviteEmail('')
            load()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not send invite')
        } finally {
            setInviting(false)
        }
    }

    const changeRole = async (memberId: string, role: Role) => {
        const response = await fetch(
            `/api/workspaces/${workspaceId}/members/${memberId}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            }
        )

        const payload = await response.json()

        if (!response.ok) {
            toast.error(payload.error || 'Could not update role')
            return
        }

        toast.success('Role updated')
        load()
    }

    const removeMember = async (memberId: string, isSelf: boolean) => {
        const response = await fetch(
            `/api/workspaces/${workspaceId}/members/${memberId}`,
            { method: 'DELETE' }
        )

        const payload = await response.json()

        if (!response.ok) {
            toast.error(payload.error || 'Could not remove member')
            return
        }

        toast.success(isSelf ? 'You left the workspace' : 'Member removed')

        if (isSelf) {
            router.push('/workspaces')
        } else {
            load()
        }
    }

    const revokeInvite = async (inviteId: string) => {
        await fetch(`/api/workspaces/${workspaceId}/invites/${inviteId}`, {
            method: 'DELETE'
        })
        toast.success('Invite revoked')
        load()
    }

    if (loading || !data) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner />
            </div>
        )
    }

    const { workspace, members, invites, viewer } = data

    return (
        <PageBody className="max-w-[860px]">
                <button
                    type="button"
                    onClick={() => router.push('/workspaces')}
                    className="link-underline mb-8 flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink"
                >
                    <ArrowLeft className="h-3 w-3" />
                    All workspaces
                </button>

                <header className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-8">
                    <div>
                        <p className="eyebrow mb-3">Workspace</p>
                        <h1 className="font-display text-[32px] font-medium leading-none tracking-[-0.035em]">
                            {workspace.name}
                        </h1>
                        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                            {members.length} member{members.length === 1 ? '' : 's'} ·{' '}
                            {workspace.meetingCount} meeting
                            {workspace.meetingCount === 1 ? '' : 's'} · created{' '}
                            {format(new Date(workspace.createdAt), 'd MMM yyyy')}
                        </p>
                    </div>

                    <span className="pill pill-info">
                        <ShieldCheck className="h-3 w-3" />
                        You are {ROLE_LABELS[viewer.role].toLowerCase()}
                    </span>
                </header>

                {viewer.permissions.canInvite && (
                    <section className="mb-12">
                        <SectionHeading>Invite people</SectionHeading>
                        <p className="mb-5 flex items-center gap-2 text-[13px] text-ink-soft">
                            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.6} />
                            They&apos;ll get an email with a link that expires in 7 days.
                        </p>

                        <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[220px] flex-1 space-y-2">
                                <Label htmlFor="invite-email" className="text-[13px]">Email address</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(event) => setInviteEmail(event.target.value)}
                                    placeholder="teammate@company.com"
                                />
                            </div>

                            <div className="w-40 space-y-2">
                                <Label className="text-[13px]">Role</Label>
                                <Select
                                    value={inviteRole}
                                    onValueChange={(value) => setInviteRole(value as Role)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {viewer.assignableRoles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {ROLE_LABELS[role]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleInvite} disabled={inviting}>
                                {inviting ? 'Sending…' : 'Send invite'}
                            </Button>
                        </div>

                        <p className="mt-4 text-[12px] text-ink-faint">
                            {ROLE_DESCRIPTIONS[inviteRole]}
                        </p>
                    </section>
                )}

                {invites.length > 0 && (
                    <section className="mb-12">
                        <SectionHeading
                            aside={
                                <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                                    {String(invites.length).padStart(2, '0')}
                                </span>
                            }
                        >
                            Pending invites
                        </SectionHeading>

                        <div>
                            {invites.map((invite) => (
                                <div
                                    key={invite.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5 first:border-t"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-[13.5px]">{invite.email}</p>
                                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                                            {ROLE_LABELS[invite.role]} · expires{' '}
                                            {format(new Date(invite.expiresAt), 'd MMM')}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    `${window.location.origin}/workspaces/join?token=${invite.token}`
                                                )
                                                toast.success('Invite link copied')
                                            }}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => revokeInvite(invite.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <SectionHeading
                        aside={
                            <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                                {String(members.length).padStart(2, '0')}
                            </span>
                        }
                    >
                        Members
                    </SectionHeading>

                    <div>
                        {members.map((member) => {
                            const canEdit =
                                viewer.permissions.canChangeRoles &&
                                member.role !== 'OWNER' &&
                                viewer.assignableRoles.includes(member.role)

                            return (
                                <div
                                    key={member.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 first:border-t"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper-2 font-mono text-[10px] font-medium">
                                            {(member.name || member.email || '?')
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-[13.5px] font-medium">
                                                {member.name || member.email || 'Unknown user'}
                                            </p>
                                            <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                                                {member.email} · joined{' '}
                                                {format(new Date(member.joinedAt), 'd MMM yyyy')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canEdit ? (
                                            <Select
                                                value={member.role}
                                                onValueChange={(value) =>
                                                    changeRole(member.id, value as Role)
                                                }
                                            >
                                                <SelectTrigger className="h-8 w-32 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {viewer.assignableRoles.map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {ROLE_LABELS[role]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="pill pill-muted">
                                                {ROLE_LABELS[member.role]}
                                            </span>
                                        )}

                                        {viewer.permissions.canRemoveMembers &&
                                            member.role !== 'OWNER' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => removeMember(member.id, false)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {viewer.role !== 'OWNER' && (
                    <div className="mt-10 border-t border-line pt-8">
                        <Button
                            variant="outline"
                            className="text-destructive hover:border-destructive hover:bg-destructive hover:text-white"
                            onClick={() => {
                                const self = members.find((m) => m.role === viewer.role)
                                if (self) removeMember(self.id, true)
                            }}
                        >
                            <LogOut className="h-4 w-4" strokeWidth={1.6} />
                            Leave workspace
                        </Button>
                    </div>
                )}
        </PageBody>
    )
}
