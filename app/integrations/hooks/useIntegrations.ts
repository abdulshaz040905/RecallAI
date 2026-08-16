'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export type IntegrationPlatformId =
    | 'google-calendar'
    | 'slack'
    | 'trello'
    | 'jira'
    | 'asana'
    | 'notion'
    | 'linear'
    | 'salesforce'
    | 'hubspot'

export interface Integration {
    platform: IntegrationPlatformId
    name: string
    description: string
    /** What the "destination" is called for this platform, e.g. board/project. */
    targetLabel: string
    category: 'Calendar' | 'Project management' | 'Docs & notes' | 'CRM' | 'Chat'
    connected: boolean
    configured?: boolean
    boardName?: string
    projectName?: string
    channelName?: string
    accountName?: string
    logo: string
}

const CATALOGUE: Integration[] = [
    {
        platform: 'google-calendar',
        name: 'Google Calendar',
        description: 'Auto-sync meetings so the bot joins on its own.',
        targetLabel: 'calendar',
        category: 'Calendar',
        connected: false,
        logo: '/gcal.png'
    },
    {
        platform: 'slack',
        name: 'Slack',
        description: 'Post meeting summaries and action items to a channel.',
        targetLabel: 'channel',
        category: 'Chat',
        connected: false,
        logo: '/slack.png'
    },
    {
        platform: 'notion',
        name: 'Notion',
        description: 'Create action items as pages in a Notion database.',
        targetLabel: 'database',
        category: 'Docs & notes',
        connected: false,
        logo: '/notion.svg'
    },
    {
        platform: 'linear',
        name: 'Linear',
        description: 'Turn follow-ups into Linear issues for your team.',
        targetLabel: 'team',
        category: 'Project management',
        connected: false,
        logo: '/linear.svg'
    },
    {
        platform: 'jira',
        name: 'Jira',
        description: 'Create tickets for development tasks and bugs.',
        targetLabel: 'project',
        category: 'Project management',
        connected: false,
        logo: '/jira.png'
    },
    {
        platform: 'asana',
        name: 'Asana',
        description: 'Sync tasks with your team projects.',
        targetLabel: 'project',
        category: 'Project management',
        connected: false,
        logo: '/asana.png'
    },
    {
        platform: 'trello',
        name: 'Trello',
        description: 'Add action items as cards on your boards.',
        targetLabel: 'board',
        category: 'Project management',
        connected: false,
        logo: '/trello.png'
    },
    {
        platform: 'salesforce',
        name: 'Salesforce',
        description: 'Log follow-ups as Tasks against a campaign.',
        targetLabel: 'campaign',
        category: 'CRM',
        connected: false,
        logo: '/salesforce.svg'
    },
    {
        platform: 'hubspot',
        name: 'HubSpot',
        description: 'Create CRM tasks linked to the right deal.',
        targetLabel: 'deal',
        category: 'CRM',
        connected: false,
        logo: '/hubspot.svg'
    }
]

/** Platforms that need a destination picked after connecting. */
const SETUP_PLATFORMS = [
    'trello',
    'jira',
    'asana',
    'slack',
    'notion',
    'linear',
    'salesforce',
    'hubspot'
]

export function useIntegrations() {
    const { userId } = useAuth()

    const [integrations, setIntegrations] = useState<Integration[]>(CATALOGUE)
    const [loading, setLoading] = useState(true)
    const [setupMode, setSetupMode] = useState<string | null>(null)
    const [setupData, setSetupData] = useState<any>(null)
    const [setupLoading, setSetupLoading] = useState(false)

    const fetchIntegrations = useCallback(async () => {
        try {
            const [statusResponse, calendarResponse] = await Promise.all([
                fetch('/api/integrations/status'),
                fetch('/api/user/calendar-status')
            ])

            const data = await statusResponse.json()
            const calendarData = await calendarResponse.json()

            setIntegrations((previous) =>
                previous.map((integration) => {
                    if (integration.platform === 'google-calendar') {
                        return {
                            ...integration,
                            connected: calendarData.connected || false,
                            configured: calendarData.connected || false
                        }
                    }

                    const status = Array.isArray(data)
                        ? data.find((entry: any) => entry.platform === integration.platform)
                        : undefined

                    return {
                        ...integration,
                        connected: status?.connected || false,
                        configured: status?.configured || false,
                        boardName: status?.boardName,
                        projectName: status?.projectName,
                        channelName: status?.channelName,
                        accountName: status?.accountName
                    }
                })
            )
        } catch (error) {
            console.error('Error fetching integrations:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchSetupData = useCallback(async (platform: string) => {
        setSetupData(null)
        try {
            const response = await fetch(`/api/integrations/${platform}/setup`)
            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || `Could not load ${platform} setup options`)
                return
            }

            setSetupData(data)
        } catch (error) {
            console.error(`Error fetching ${platform} setup data:`, error)
            toast.error(`Could not load ${platform} setup options`)
        }
    }, [])

    useEffect(() => {
        if (userId) {
            fetchIntegrations()
        }

        const urlParams = new URLSearchParams(window.location.search)

        const setup = urlParams.get('setup')
        if (setup && SETUP_PLATFORMS.includes(setup)) {
            setSetupMode(setup)
            fetchSetupData(setup)
        }

        const success = urlParams.get('success')
        if (success) {
            toast.success(`${success.replace(/_/g, ' ')}`)
        }

        const error = urlParams.get('error')
        if (error) {
            toast.error(
                error === 'auth_failed'
                    ? 'Authorisation failed or was cancelled. Please try again.'
                    : 'Could not save that integration. Please try again.'
            )
        }
    }, [userId, fetchIntegrations, fetchSetupData])

    const handleConnect = (platform: string) => {
        if (platform === 'slack') {
            window.location.href = '/api/slack/install?return=integrations'
        } else if (platform === 'google-calendar') {
            window.location.href = '/api/auth/google/direct-connect'
        } else {
            window.location.href = `/api/integrations/${platform}/auth`
        }
    }

    const handleDisconnect = async (platform: string) => {
        try {
            const endpoint =
                platform === 'google-calendar'
                    ? '/api/auth/google/disconnect'
                    : `/api/integrations/${platform}/disconnect`

            await fetch(endpoint, { method: 'POST' })
            toast.success('Disconnected')
            fetchIntegrations()
        } catch (error) {
            console.error('Error disconnecting:', error)
            toast.error('Could not disconnect')
        }
    }

    const handleSetupSubmit = async (platform: string, config: any) => {
        setSetupLoading(true)
        try {
            const response = await fetch(`/api/integrations/${platform}/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Could not save setup')
                return
            }

            toast.success('Destination saved')
            setSetupMode(null)
            setSetupData(null)
            fetchIntegrations()
            window.history.replaceState({}, '', '/integrations')
        } catch (error) {
            console.error('Error saving setup:', error)
            toast.error('Could not save setup')
        } finally {
            setSetupLoading(false)
        }
    }

    return {
        integrations,
        loading,
        setupMode,
        setSetupMode,
        setupData,
        setSetupData,
        setupLoading,
        setSetupLoading,
        fetchIntegrations,
        fetchSetupData,
        handleConnect,
        handleDisconnect,
        handleSetupSubmit
    }
}
