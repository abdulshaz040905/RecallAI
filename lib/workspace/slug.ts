import crypto from 'crypto'

/**
 * Pure slug / invite-token helpers.
 *
 * Kept separate from `service.ts` so they can be imported (and unit tested)
 * without pulling in the Prisma client.
 */

export const INVITE_TTL_DAYS = 7

/** URL-safe slug derived from a workspace name. */
export function slugify(name: string): string {
    const base = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)

    return base || 'workspace'
}

export function createInviteToken(): string {
    return crypto.randomBytes(24).toString('base64url')
}

export function inviteExpiry(days: number = INVITE_TTL_DAYS, now: Date = new Date()): Date {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

export function isInviteExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
    return new Date(expiresAt).getTime() < now.getTime()
}
