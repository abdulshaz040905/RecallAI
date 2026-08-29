import crypto from 'crypto'

/**
 * PKCE (RFC 7636) helpers.
 *
 * Salesforce enforces PKCE on connected apps — the "Require Proof Key for Code
 * Exchange" setting is on and cannot be turned off — so the authorize request
 * must carry a `code_challenge` and the token exchange the matching
 * `code_verifier`.
 *
 * The verifier has to survive the round trip to the provider without being
 * visible to it. It therefore goes in a short-lived httpOnly cookie rather than
 * in `state`: `state` travels through the provider and back in the URL, so
 * anything hidden in it is readable by whoever can see that URL — which is
 * exactly the attack PKCE exists to stop.
 */

/** Cookie lifetime. Long enough to log in and approve, short enough to be safe. */
export const PKCE_COOKIE_MAX_AGE = 10 * 60

export function pkceCookieName(platform: string): string {
    return `pkce_${platform}`
}

/** A high-entropy verifier: 43–128 chars from the unreserved set. */
export function createCodeVerifier(): string {
    return crypto.randomBytes(48).toString('base64url')
}

/** S256 challenge — the only method Salesforce accepts. */
export function createCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url')
}
