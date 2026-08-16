import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Type errors and lint errors now fail the build. The codebase typechecks
    // clean (`npm run typecheck`), so silently shipping broken types would be
    // strictly worse than finding out at build time.
    eslint: { ignoreDuringBuilds: false },
    typescript: { ignoreBuildErrors: false },

    // Smaller HTML payloads and slightly faster TTFB.
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,

    images: {
        // Avatars and logos come from these hosts.
        remotePatterns: [
            { protocol: 'https', hostname: '**.clerk.com' },
            { protocol: 'https', hostname: 'img.clerk.com' },
            { protocol: 'https', hostname: '**.amazonaws.com' },
            { protocol: 'https', hostname: '**.googleusercontent.com' },
            { protocol: 'https', hostname: '**.slack-edge.com' }
        ],
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60 * 60 * 24 * 30
    },

    experimental: {
        // Tree-shake these barrel-file heavy packages so a single icon import
        // doesn't pull the whole library into the client bundle.
        optimizePackageImports: ['lucide-react', 'date-fns', 'recharts']
    },

    // Keep heavy server-only SDKs out of the bundler's dependency graph.
    serverExternalPackages: [
        '@prisma/client',
        '@pinecone-database/pinecone',
        'nodemailer'
    ],

    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    }
                ]
            },
            {
                // Immutable, content-hashed assets.
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable'
                    }
                ]
            }
        ]
    }
}

export default nextConfig
