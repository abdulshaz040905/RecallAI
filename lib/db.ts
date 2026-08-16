import { PrismaClient } from '@prisma/client'

/**
 * Prisma singleton.
 *
 * Two things worth knowing about this file:
 *
 * 1. The client is cached on `globalThis` so Next.js hot reloading in dev
 *    doesn't open a new connection pool on every save.
 *
 * 2. Instantiation is *lazy*, behind a Proxy. `next build` imports every route
 *    module to collect its config; with an eager `new PrismaClient()` that
 *    forces the native query engine to load at build time, which fails on
 *    machines/CI images where the engine for the build platform isn't present.
 *    Deferring construction until the first actual query keeps builds portable
 *    and shaves work off serverless cold starts that never touch the database.
 */

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
    return new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
        log:
            process.env.NODE_ENV === 'development'
                ? ['warn', 'error']
                : ['error']
    })
}

export function getPrisma(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createClient()
    }

    return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
    get(_target, property, receiver) {
        return Reflect.get(getPrisma(), property, receiver)
    },
    has(_target, property) {
        return Reflect.has(getPrisma(), property)
    },
    ownKeys() {
        return Reflect.ownKeys(getPrisma())
    },
    getOwnPropertyDescriptor(_target, property) {
        return Reflect.getOwnPropertyDescriptor(getPrisma(), property)
    }
})

export default prisma
