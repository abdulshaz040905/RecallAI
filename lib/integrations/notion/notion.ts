import { ActionItemData, SetupTarget } from '../types'

const NOTION_VERSION = '2022-06-28'

/**
 * Thin Notion REST client.
 *
 * Action items are created as pages inside a user-selected database. We detect
 * the database's title property at write time so we work with any schema.
 */
export class NotionAPI {
    private baseUrl = 'https://api.notion.com/v1'

    private headers(token: string) {
        return {
            Authorization: `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json'
        }
    }

    private async request(token: string, path: string, init: RequestInit = {}) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers: { ...this.headers(token), ...(init.headers || {}) }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[notion] request failed:', path, response.status, errorText)
            throw new Error(`Notion API error ${response.status}: ${errorText}`)
        }

        return response.json()
    }

    /** Every database the integration has been granted access to. */
    async listDatabases(token: string): Promise<SetupTarget[]> {
        const data = await this.request(token, '/search', {
            method: 'POST',
            body: JSON.stringify({
                filter: { property: 'object', value: 'database' },
                page_size: 100
            })
        })

        return (data.results || []).map((db: any) => ({
            id: db.id,
            name:
                db.title?.map((t: any) => t.plain_text).join('') ||
                'Untitled database'
        }))
    }

    /** Pages the integration can write to — used as parents for new databases. */
    async listPages(token: string): Promise<SetupTarget[]> {
        const data = await this.request(token, '/search', {
            method: 'POST',
            body: JSON.stringify({
                filter: { property: 'object', value: 'page' },
                page_size: 100
            })
        })

        return (data.results || []).map((page: any) => ({
            id: page.id,
            name:
                page.properties?.title?.title?.[0]?.plain_text ||
                page.properties?.Name?.title?.[0]?.plain_text ||
                'Untitled page'
        }))
    }

    async getDatabase(token: string, databaseId: string) {
        return this.request(token, `/databases/${databaseId}`)
    }

    /** Creates an action-item database with a sensible default schema. */
    async createDatabase(token: string, parentPageId: string, name: string) {
        return this.request(token, '/databases', {
            method: 'POST',
            body: JSON.stringify({
                parent: { type: 'page_id', page_id: parentPageId },
                title: [{ type: 'text', text: { content: name } }],
                properties: {
                    Name: { title: {} },
                    Status: {
                        select: {
                            options: [
                                { name: 'To Do', color: 'red' },
                                { name: 'In Progress', color: 'yellow' },
                                { name: 'Done', color: 'green' }
                            ]
                        }
                    },
                    'Due Date': { date: {} },
                    Source: { rich_text: {} }
                }
            })
        })
    }

    /** Finds the database's title property name (schemas vary per workspace). */
    private async getTitlePropertyName(token: string, databaseId: string) {
        const database = await this.getDatabase(token, databaseId)
        const properties = database.properties || {}

        const titleKey = Object.keys(properties).find(
            (key) => properties[key]?.type === 'title'
        )

        return { titleKey: titleKey || 'Name', properties }
    }

    async createActionItem(
        token: string,
        databaseId: string,
        data: ActionItemData
    ) {
        const { titleKey, properties } = await this.getTitlePropertyName(
            token,
            databaseId
        )

        const pageProperties: Record<string, unknown> = {
            [titleKey]: {
                title: [{ type: 'text', text: { content: data.title.slice(0, 2000) } }]
            }
        }

        if (properties['Status']?.type === 'select') {
            pageProperties['Status'] = { select: { name: 'To Do' } }
        }

        if (data.dueDate && properties['Due Date']?.type === 'date') {
            pageProperties['Due Date'] = { date: { start: data.dueDate } }
        }

        if (data.description && properties['Source']?.type === 'rich_text') {
            pageProperties['Source'] = {
                rich_text: [
                    { type: 'text', text: { content: data.description.slice(0, 2000) } }
                ]
            }
        }

        return this.request(token, '/pages', {
            method: 'POST',
            body: JSON.stringify({
                parent: { database_id: databaseId },
                properties: pageProperties,
                children: data.description
                    ? [
                          {
                              object: 'block',
                              type: 'paragraph',
                              paragraph: {
                                  rich_text: [
                                      {
                                          type: 'text',
                                          text: { content: data.description.slice(0, 2000) }
                                      }
                                  ]
                              }
                          }
                      ]
                    : []
            })
        })
    }
}
