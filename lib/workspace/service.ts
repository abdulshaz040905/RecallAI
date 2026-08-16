import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { Role } from './rbac'
import { appUrl } from '@/lib/app-url'
import { createInviteToken, INVITE_TTL_DAYS, inviteExpiry, slugify } from './slug'

// Re-exported so callers keep a single import site.
export { createInviteToken, INVITE_TTL_DAYS, inviteExpiry, slugify }

export async function generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name)

    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate =
            attempt === 0 ? base : `${base}-${crypto.randomBytes(2).toString('hex')}`
        const existing = await prisma.workspace.findUnique({ where: { slug: candidate } })

        if (!existing) {
            return candidate
        }
    }

    return `${base}-${crypto.randomBytes(4).toString('hex')}`
}

/** Resolves the internal user row for a Clerk id, creating nothing. */
export async function getDbUser(clerkId: string) {
    return prisma.user.findUnique({ where: { clerkId } })
}

export interface Membership {
    workspaceId: string
    userId: string
    role: Role
}

/** The caller's role in a workspace, or null when they are not a member. */
export async function getMembership(
    workspaceId: string,
    userId: string
): Promise<Membership | null> {
    const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        select: { workspaceId: true, userId: true, role: true }
    })

    return member ? { ...member, role: member.role as Role } : null
}

export async function listWorkspacesForUser(userId: string) {
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        orderBy: { joinedAt: 'asc' },
        include: {
            workspace: {
                include: {
                    _count: { select: { members: true, meetings: true } }
                }
            }
        }
    })

    return memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        about: membership.workspace.about,
        logo: membership.workspace.logo,
        role: membership.role as Role,
        memberCount: membership.workspace._count.members,
        meetingCount: membership.workspace._count.meetings,
        createdAt: membership.workspace.createdAt
    }))
}

/** Creates a workspace and makes the creator its OWNER in one transaction. */
export async function createWorkspace(params: {
    userId: string
    name: string
    about?: string | null
}) {
    const slug = await generateUniqueSlug(params.name)

    return prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
            data: {
                name: params.name.trim(),
                about: params.about?.trim() || null,
                slug,
                ownerId: params.userId
            }
        })

        await tx.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId: params.userId,
                role: 'OWNER'
            }
        })

        await tx.user.update({
            where: { id: params.userId },
            data: { activeWorkspaceId: workspace.id }
        })

        return workspace
    })
}

/**
 * Accepts an invite: validates the token, expiry and status, then upserts the
 * membership. Returns a discriminated result rather than throwing so the route
 * can map cleanly onto HTTP statuses.
 */
export async function acceptInvite(token: string, userId: string, email?: string | null) {
    const invite = await prisma.workspaceInvite.findUnique({
        where: { token },
        include: { workspace: { select: { id: true, name: true, slug: true } } }
    })

    if (!invite) {
        return { ok: false as const, reason: 'not_found' as const }
    }

    if (invite.status !== 'PENDING') {
        return { ok: false as const, reason: 'already_used' as const }
    }

    if (invite.expiresAt.getTime() < Date.now()) {
        await prisma.workspaceInvite.update({
            where: { id: invite.id },
            data: { status: 'EXPIRED' }
        })
        return { ok: false as const, reason: 'expired' as const }
    }

    // Invites are addressed to an email; block token sharing across accounts.
    if (email && invite.email.toLowerCase() !== email.toLowerCase()) {
        return { ok: false as const, reason: 'wrong_account' as const }
    }

    await prisma.$transaction([
        prisma.workspaceMember.upsert({
            where: {
                workspaceId_userId: { workspaceId: invite.workspaceId, userId }
            },
            update: { role: invite.role },
            create: {
                workspaceId: invite.workspaceId,
                userId,
                role: invite.role
            }
        }),
        prisma.workspaceInvite.update({
            where: { id: invite.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date() }
        })
    ])

    return { ok: true as const, workspace: invite.workspace, role: invite.role as Role }
}

/**
 * A workspace must always keep at least one owner — used to block the last
 * owner from leaving or demoting themselves.
 */
export async function countOwners(workspaceId: string): Promise<number> {
    return prisma.workspaceMember.count({
        where: { workspaceId, role: 'OWNER' }
    })
}

export function inviteUrl(token: string): string {
    return appUrl('/workspaces/join', { token }).toString()
}
