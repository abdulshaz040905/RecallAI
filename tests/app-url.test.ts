import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL

afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL
    vi.resetModules()
})

async function load() {
    vi.resetModules()
    return import('@/lib/app-url')
}

describe('getAppOrigin', () => {
    it('uses a valid configured origin', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://recall.example.com'
        const { getAppOrigin } = await load()
        expect(getAppOrigin()).toBe('https://recall.example.com')
    })

    it('strips a trailing path from the configured value', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://recall.example.com/app/'
        const { getAppOrigin } = await load()
        expect(getAppOrigin()).toBe('https://recall.example.com')
    })

    it('falls back to localhost for the .env placeholder instead of throwing', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'I will fill here'
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { getAppOrigin } = await load()

        expect(getAppOrigin()).toBe('http://localhost:3000')
        expect(warn).toHaveBeenCalled()
        warn.mockRestore()
    })

    it('falls back when the protocol is missing', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'recall.example.com'
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { getAppOrigin } = await load()
        expect(getAppOrigin()).toBe('http://localhost:3000')
    })

    it('falls back when unset', async () => {
        delete process.env.NEXT_PUBLIC_APP_URL
        const { getAppOrigin } = await load()
        expect(getAppOrigin()).toBe('http://localhost:3000')
    })

    it('only warns once, not on every request', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'nope'
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { getAppOrigin } = await load()

        getAppOrigin()
        getAppOrigin()
        getAppOrigin()

        expect(warn).toHaveBeenCalledTimes(1)
        warn.mockRestore()
    })
})

describe('getAppUrl', () => {
    it('never throws, even with a garbage env value', async () => {
        process.env.NEXT_PUBLIC_APP_URL = '???'
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { getAppUrl } = await load()
        expect(() => getAppUrl()).not.toThrow()
        expect(getAppUrl()).toBeInstanceOf(URL)
    })
})

describe('appUrl', () => {
    it('builds a path on the configured origin', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://recall.example.com'
        const { appUrl } = await load()
        expect(appUrl('/integrations').toString()).toBe(
            'https://recall.example.com/integrations'
        )
    })

    it('appends query params', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://recall.example.com'
        const { appUrl } = await load()
        const url = appUrl('/integrations', { setup: 'notion', success: 'connected' })

        expect(url.searchParams.get('setup')).toBe('notion')
        expect(url.searchParams.get('success')).toBe('connected')
    })

    it('URL-encodes invite tokens safely', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://recall.example.com'
        const { appUrl } = await load()
        const url = appUrl('/workspaces/join', { token: 'a+b/c=d' })

        expect(url.searchParams.get('token')).toBe('a+b/c=d')
    })
})
