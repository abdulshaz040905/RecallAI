'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useState } from 'react'
import type { Role } from '@/lib/workspace/rbac'

export interface WorkspaceSummary {
    id: string
    name: string
    slug: string
    about?: string | null
    logo?: string | null
    role: Role
    memberCount: number
    meetingCount: number
    createdAt: string
}

export function useWorkspaces() {
    const { userId, isLoaded } = useAuth()
    const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchWorkspaces = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/workspaces')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load workspaces')
            }

            setWorkspaces(data.workspaces ?? [])
            setActiveWorkspaceId(data.activeWorkspaceId ?? null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load workspaces')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (isLoaded && userId) {
            fetchWorkspaces()
        } else if (isLoaded) {
            setLoading(false)
        }
    }, [isLoaded, userId, fetchWorkspaces])

    const createWorkspace = useCallback(
        async (name: string, about?: string) => {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, about })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create workspace')
            }

            await fetchWorkspaces()
            return data.workspace
        },
        [fetchWorkspaces]
    )

    const switchWorkspace = useCallback(async (workspaceId: string | null) => {
        // Optimistic — the switcher should feel instant.
        setActiveWorkspaceId(workspaceId)

        const response = await fetch('/api/workspaces/active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId })
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to switch workspace')
        }
    }, [])

    const activeWorkspace =
        workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null

    return {
        workspaces,
        activeWorkspace,
        activeWorkspaceId,
        loading,
        error,
        fetchWorkspaces,
        createWorkspace,
        switchWorkspace
    }
}
