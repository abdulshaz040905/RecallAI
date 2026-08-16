import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['lib/**/*.ts'],
            exclude: ['lib/db.ts', 'lib/email-service*.tsx']
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './')
        }
    }
})
