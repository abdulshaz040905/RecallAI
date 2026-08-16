/**
 * Resolving the app's own origin.
 *
 * `new URL()` throws on anything that isn't a valid absolute URL — including an
 * unfilled `.env` placeholder. Since this value is read at module scope in
 * layouts and inside redirect helpers, one bad env var can crash every request
 * with an opaque ERR_INVALID_URL. These helpers degrade to localhost and warn
 * loudly instead.
 */

const FALLBACK_ORIGIN = 'http://localhost:3000'

let warned = false

export function getAppOrigin(): string {
    const raw = process.env.NEXT_PUBLIC_APP_URL

    if (raw) {
        try {
            // Throws on placeholders, bare hostnames and missing protocols.
            return new URL(raw).origin
        } catch {
            if (!warned) {
                warned = true
                console.warn(
                    `[config] NEXT_PUBLIC_APP_URL is not a valid absolute URL (got "${raw}"). ` +
                        `Falling back to ${FALLBACK_ORIGIN}. Set it to your real origin, ` +
                        'including the protocol — e.g. https://your-domain.com'
                )
            }
        }
    }

    return FALLBACK_ORIGIN
}

export function getAppUrl(): URL {
    return new URL(getAppOrigin())
}

/** Builds an absolute URL on the app's own origin. */
export function appUrl(path: string, params?: Record<string, string>): URL {
    const url = new URL(path, getAppOrigin())

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value)
        }
    }

    return url
}
