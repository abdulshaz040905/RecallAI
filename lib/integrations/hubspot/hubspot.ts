import { ActionItemData, SetupTarget } from '../types'

/**
 * HubSpot CRM client.
 *
 * Action items become Task engagements. Users can optionally attach them to a
 * Deal so meeting follow-ups roll up to the right pipeline record.
 */
export class HubSpotAPI {
    private baseUrl = 'https://api.hubapi.com'

    private async request(token: string, path: string, init: RequestInit = {}) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(init.headers || {})
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[hubspot] request failed:', path, response.status, errorText)
            throw new Error(`HubSpot API error ${response.status}: ${errorText}`)
        }

        if (response.status === 204) {
            return null
        }

        return response.json()
    }

    async getTokenInfo(token: string) {
        return this.request(token, `/oauth/v1/access-tokens/${token}`)
    }

    async getDeals(token: string): Promise<SetupTarget[]> {
        const data = await this.request(
            token,
            '/crm/v3/objects/deals?limit=100&properties=dealname'
        )

        return (data?.results || []).map((deal: any) => ({
            id: deal.id,
            name: deal.properties?.dealname || `Deal ${deal.id}`
        }))
    }

    async createDeal(token: string, name: string) {
        const data = await this.request(token, '/crm/v3/objects/deals', {
            method: 'POST',
            body: JSON.stringify({
                properties: {
                    dealname: name,
                    pipeline: 'default',
                    dealstage: 'appointmentscheduled'
                }
            })
        })

        return { id: data.id as string, name }
    }

    async createTask(token: string, item: ActionItemData, dealId?: string | null) {
        const dueTimestamp = item.dueDate
            ? new Date(item.dueDate).getTime()
            : Date.now() + 3 * 24 * 60 * 60 * 1000

        const body: Record<string, unknown> = {
            properties: {
                hs_task_subject: item.title.slice(0, 255),
                hs_task_body: item.description || 'Action item captured from a meeting.',
                hs_task_status: 'NOT_STARTED',
                hs_task_priority: 'MEDIUM',
                hs_task_type: 'TODO',
                hs_timestamp: String(dueTimestamp)
            }
        }

        if (dealId) {
            // 216 is the standard "task to deal" association type id.
            body.associations = [
                {
                    to: { id: dealId },
                    types: [
                        {
                            associationCategory: 'HUBSPOT_DEFINED',
                            associationTypeId: 216
                        }
                    ]
                }
            ]
        }

        return this.request(token, '/crm/v3/objects/tasks', {
            method: 'POST',
            body: JSON.stringify(body)
        })
    }
}
