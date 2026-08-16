import crypto from 'crypto'
import { appUrl } from '@/lib/app-url'

/**
 * OAuth `state` protection.
 *
 * The original implementation passed the raw Clerk user id as `state`, which
 * means anyone who knows a user id can forge a callback. We now sign the state
 * with an HMAC so a callback is only accepted if we minted it, and we bind it
 * to a short expiry window.
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000

function getSecret(): string {
    return (
        process.env.OAUTH_STATE_SECRET ||
        process.env.CLERK_SECRET_KEY ||
        'recall-ai-dev-only-state-secret'
    )
}

function sign(payload: string): string {
    return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function createOAuthState(userId: string, platform: string): string {
    const payload = `${userId}.${platform}.${Date.now()}`
    return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
}

export interface VerifiedState {
    valid: boolean
    userId?: string
    platform?: string
    reason?: string
}

export function verifyOAuthState(
    state: string | null,
    platform: string,
    { ttlMs = DEFAULT_TTL_MS, now = Date.now() }: { ttlMs?: number; now?: number } = {}
): VerifiedState {
    if (!state) {
        return { valid: false, reason: 'missing_state' }
    }

    const [encoded, signature] = state.split('.')

    if (!encoded || !signature) {
        return { valid: false, reason: 'malformed_state' }
    }

    let payload: string
    try {
        payload = Buffer.from(encoded, 'base64url').toString('utf8')
    } catch {
        return { valid: false, reason: 'malformed_state' }
    }

    const expected = sign(payload)

    // Constant-time compare; lengths always match for hex sha256 digests.
    if (
        signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
        return { valid: false, reason: 'bad_signature' }
    }

    const [userId, statePlatform, issuedAt] = payload.split('.')

    if (statePlatform !== platform) {
        return { valid: false, reason: 'platform_mismatch' }
    }

    if (now - Number(issuedAt) > ttlMs) {
        return { valid: false, reason: 'expired' }
    }

    return { valid: true, userId, platform: statePlatform }
}

/** Absolute URL back into the integrations page with a status flag. */
export function integrationsRedirect(params: Record<string, string>): URL {
    return appUrl('/integrations', params)
}
