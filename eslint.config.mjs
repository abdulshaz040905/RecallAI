import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
    {
        ignores: [
            '.next/**',
            'node_modules/**',
            'coverage/**',
            // Deployed separately with their own bundled dependencies.
            'lambda-function/node_modules/**',
            'lambda-chat/node_modules/**',
            'next-env.d.ts'
        ]
    },

    ...compat.extends('next/core-web-vitals', 'next/typescript'),

    {
        rules: {
            /**
             * We talk to eight third-party APIs (Notion, Linear, Salesforce,
             * HubSpot, Jira, Asana, Trello, Slack) whose payloads have no
             * published TypeScript types. Narrowing every response into a
             * hand-written interface would be a lot of fiction that drifts the
             * moment a provider adds a field, so `any` at those boundaries is
             * deliberate. Kept as a warning so it stays visible without
             * blocking builds.
             */
            '@typescript-eslint/no-explicit-any': 'warn',

            // Allow intentionally unused args when prefixed with an underscore.
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_'
                }
            ]
        }
    },

    {
        // Tests intentionally poke at edge cases and mock loosely typed values.
        files: ['tests/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
]

export default eslintConfig
