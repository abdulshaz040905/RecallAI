import { UserIntegration } from '@prisma/client'
import { AsanaAPI } from './asana/asana'
import { HubSpotAPI } from './hubspot/hubspot'
import { JiraAPI } from './jira/jira'
import { LinearAPI } from './linear/linear'
import { NotionAPI } from './notion/notion'
import { SalesforceAPI } from './salesforce/salesforce'
import { TrelloAPI } from './trello/trello'
import { ActionItemData } from './types'

export class IntegrationConfigError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'IntegrationConfigError'
    }
}

export interface DispatchResult {
    platform: string
    url?: string
    externalId?: string
}

/**
 * Sends one action item to whichever destination the user configured for a
 * platform. Throws IntegrationConfigError when the integration is connected
 * but not fully set up, so the API layer can return a 400 instead of a 500.
 */
export async function dispatchActionItem(
    integration: UserIntegration,
    item: ActionItemData
): Promise<DispatchResult> {
    switch (integration.platform) {
        case 'trello': {
            if (!integration.boardId) {
                throw new IntegrationConfigError('Trello board not configured')
            }

            const trello = new TrelloAPI()
            const lists = await trello.getBoardLists(
                integration.accessToken,
                integration.boardId
            )

            const todoList =
                lists.find((list: any) =>
                    ['to do', 'todo', 'backlog'].some((name) =>
                        list.name.toLowerCase().includes(name)
                    )
                ) || lists[0]

            if (!todoList) {
                throw new IntegrationConfigError('No suitable Trello list found')
            }

            const card = await trello.createCard(integration.accessToken, todoList.id, item)
            return { platform: 'trello', externalId: card?.id, url: card?.shortUrl }
        }

        case 'jira': {
            if (!integration.projectId || !integration.workspaceId) {
                throw new IntegrationConfigError('Jira project not configured')
            }

            const issue = await new JiraAPI().createIssue(
                integration.accessToken,
                integration.workspaceId,
                integration.projectId,
                item
            )
            return { platform: 'jira', externalId: issue?.key }
        }

        case 'asana': {
            if (!integration.projectId) {
                throw new IntegrationConfigError('Asana project not configured')
            }

            const task = await new AsanaAPI().createTask(
                integration.accessToken,
                integration.projectId,
                item
            )
            return { platform: 'asana', externalId: task?.data?.gid }
        }

        case 'notion': {
            if (!integration.databaseId) {
                throw new IntegrationConfigError('Notion database not configured')
            }

            const page = await new NotionAPI().createActionItem(
                integration.accessToken,
                integration.databaseId,
                item
            )
            return { platform: 'notion', externalId: page?.id, url: page?.url }
        }

        case 'linear': {
            if (!integration.teamId) {
                throw new IntegrationConfigError('Linear team not configured')
            }

            const issue = await new LinearAPI().createIssue(
                integration.accessToken,
                integration.teamId,
                item
            )
            return { platform: 'linear', externalId: issue?.identifier, url: issue?.url }
        }

        case 'salesforce': {
            if (!integration.instanceUrl) {
                throw new IntegrationConfigError('Salesforce instance URL missing')
            }

            const task = await new SalesforceAPI().createTask(
                integration.accessToken,
                integration.instanceUrl,
                item,
                integration.projectId
            )
            return {
                platform: 'salesforce',
                externalId: task?.id,
                url: task?.id
                    ? `${integration.instanceUrl}/lightning/r/Task/${task.id}/view`
                    : undefined
            }
        }

        case 'hubspot': {
            const task = await new HubSpotAPI().createTask(
                integration.accessToken,
                item,
                integration.projectId
            )
            return { platform: 'hubspot', externalId: task?.id }
        }

        case 'slack': {
            const channel = integration.boardId || integration.projectId
            if (!channel) {
                throw new IntegrationConfigError('Slack channel not configured')
            }

            const response = await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${integration.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channel,
                    text: `:clipboard: *Action item*\n${item.title}${
                        item.description ? `\n_${item.description}_` : ''
                    }`
                })
            })

            const result = await response.json()

            if (!response.ok || !result.ok) {
                throw new Error(`Slack API error: ${result.error || response.status}`)
            }

            return { platform: 'slack', externalId: result.ts }
        }

        default:
            throw new IntegrationConfigError(
                `Unsupported platform: ${integration.platform}`
            )
    }
}
