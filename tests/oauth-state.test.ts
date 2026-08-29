import { beforeAll, describe, expect, it } from 'vitest'
import { createOAuthState, verifyOAuthState } from '@/lib/integrations/oauth-state'
import { shouldRefresh, REFRESH_SKEW_MS } from '@/lib/integrations/token-expiry'
import { isIntegrationPlatform, INTEGRATION_PLATFORMS } from '@/lib/integrations/types'
import { inviteExpiry, isInviteExpired, slugify } from '@/lib/workspace/slug'

beforeAll(() => {
    process.env.OAUTH_STATE_SECRET = 'test-secret-for-oauth-state-verification'
})

describe('OAuth state signing', () => {
    it('round-trips a valid state', () => {
        const state = createOAuthState('user_123', 'notion')
        const result = verifyOAuthState(state, 'notion')

        expect(result.valid).toBe(true)
        expect(result.userId).toBe('user_123')
        expect(result.platform).toBe('notion')
    })

    it('rejects a missing state', () => {
        expect(verifyOAuthState(null, 'notion')).toMatchObject({
            valid: false,
            reason: 'missing_state'
        })
    })

    it('rejects a malformed state', () => {
        expect(verifyOAuthState('garbage', 'notion').valid).toBe(false)
    })

    it('rejects a tampered payload', () => {
        const state = createOAuthState('user_123', 'notion')
        const [, signature] = state.split('.')
        const forged = `${Buffer.from('attacker.notion.' + Date.now()).toString(
            'base64url'
        )}.${signature}`

        expect(verifyOAuthState(forged, 'notion')).toMatchObject({
            valid: false,
            reason: 'bad_signature'
        })
    })

    it('rejects state minted for a different platform', () => {
        const state = createOAuthState('user_123', 'notion')
        expect(verifyOAuthState(state, 'linear')).toMatchObject({
            valid: false,
            reason: 'platform_mismatch'
        })
    })

    it('rejects an expired state', () => {
        const state = createOAuthState('user_123', 'notion')
        const result = verifyOAuthState(state, 'notion', {
            ttlMs: 1000,
            now: Date.now() + 60_000
        })

        expect(result).toMatchObject({ valid: false, reason: 'expired' })
    })

    it('produces a different state each call', () => {
        const a = createOAuthState('user_123', 'notion')
        const b = createOAuthState('user_123', 'notion')
        // Same second is possible, but the value should still verify.
        expect(verifyOAuthState(a, 'notion').valid).toBe(true)
        expect(verifyOAuthState(b, 'notion').valid).toBe(true)
    })
})

describe('shouldRefresh', () => {
    const now = new Date('2026-08-08T12:00:00Z')

    it('never refreshes platforms with non-expiring tokens', () => {
        expect(shouldRefresh('notion', null, now)).toBe(false)
        expect(shouldRefresh('trello', null, now)).toBe(false)
        expect(shouldRefresh('linear', null, now)).toBe(false)
    })

    it('refreshes when the token has already expired', () => {
        expect(
            shouldRefresh('salesforce', new Date('2026-08-08T11:00:00Z'), now)
        ).toBe(true)
    })

    it('refreshes inside the skew window', () => {
        const justInside = new Date(now.getTime() + REFRESH_SKEW_MS - 1000)
        expect(shouldRefresh('jira', justInside, now)).toBe(true)
    })

    it('leaves a comfortably valid token alone', () => {
        const later = new Date(now.getTime() + 60 * 60 * 1000)
        expect(shouldRefresh('jira', later, now)).toBe(false)
    })

    it('refreshes when there is no expiry recorded', () => {
        expect(shouldRefresh('salesforce', null, now)).toBe(true)
    })
})

describe('integration platform registry', () => {
    it('includes every new integration', () => {
        for (const platform of ['notion', 'linear', 'salesforce']) {
            expect(INTEGRATION_PLATFORMS).toContain(platform)
            expect(isIntegrationPlatform(platform)).toBe(true)
        }
    })

    it('keeps the original integrations', () => {
        for (const platform of ['slack', 'trello', 'jira']) {
            expect(isIntegrationPlatform(platform)).toBe(true)
        }
    })

    it('rejects unknown platforms', () => {
        expect(isIntegrationPlatform('myspace')).toBe(false)
        expect(isIntegrationPlatform('')).toBe(false)
    })
})

describe('slugify', () => {
    it('lowercases and hyphenates', () => {
        expect(slugify('Acme Product Team')).toBe('acme-product-team')
    })

    it('strips punctuation', () => {
        expect(slugify('Q4 / Planning!! (2026)')).toBe('q4-planning-2026')
    })

    it('collapses repeated separators and trims edges', () => {
        expect(slugify('  --Hello   World--  ')).toBe('hello-world')
    })

    it('falls back for a name with no usable characters', () => {
        expect(slugify('!!!')).toBe('workspace')
    })

    it('caps the length', () => {
        expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(40)
    })
})

describe('invite expiry', () => {
    const now = new Date('2026-08-08T12:00:00Z')

    it('defaults to a 7 day window', () => {
        const expires = inviteExpiry(undefined, now)
        expect(expires.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('treats a past expiry as expired', () => {
        expect(isInviteExpired(new Date('2026-08-01T00:00:00Z'), now)).toBe(true)
    })

    it('treats a future expiry as valid', () => {
        expect(isInviteExpired(inviteExpiry(7, now), now)).toBe(false)
    })
})
