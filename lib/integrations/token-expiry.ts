import { REFRESHABLE_PLATFORMS } from './types'

/**
 * Pure token-expiry logic.
 *
 * Split out from `refreshTokenIfNeeded.ts` so it can be imported without
 * pulling in the Prisma client (and so it is trivially unit testable).
 */

/** Refresh a token when it is expired or within this many ms of expiring. */
export const REFRESH_SKEW_MS = 5 * 60 * 1000

export function shouldRefresh(
    platform: string,
    expiresAt: Date | null | undefined,
    now: Date = new Date()
): boolean {
    if (!(REFRESHABLE_PLATFORMS as readonly string[]).includes(platform)) {
        return false
    }

    if (!expiresAt) {
        return true
    }

    return now.getTime() >= new Date(expiresAt).getTime() - REFRESH_SKEW_MS
}
