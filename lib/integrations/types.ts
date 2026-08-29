export const INTEGRATION_PLATFORMS = [
    'slack',
    'trello',
    'jira',
    'notion',
    'linear',
    'salesforce'
] as const

export type IntegrationPlatform = (typeof INTEGRATION_PLATFORMS)[number]

/** Platforms whose OAuth tokens expire and need refreshing. */
export const REFRESHABLE_PLATFORMS: IntegrationPlatform[] = [
    'jira',
    'salesforce',
]

export interface IntegrationConfig {
    platform: IntegrationPlatform
    connected: boolean
    boardName?: string
    projectName?: string
    databaseName?: string
    teamName?: string
    channelName?: string
}

export interface ActionItemData {
    title: string
    description?: string
    dueDate?: string
    assignee?: string
}

/** Normalised "where do action items go" descriptor returned by /setup GETs. */
export interface SetupTarget {
    id: string
    name: string
    key?: string
}

export function isIntegrationPlatform(value: string): value is IntegrationPlatform {
    return (INTEGRATION_PLATFORMS as readonly string[]).includes(value)
}
