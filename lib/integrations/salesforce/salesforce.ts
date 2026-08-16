import { ActionItemData, SetupTarget } from '../types'

const API_VERSION = process.env.SALESFORCE_API_VERSION || 'v60.0'

/**
 * Salesforce client.
 *
 * Action items become Task records. Users can optionally scope them to a
 * Campaign (used here as the "project" concept) so meeting follow-ups stay
 * grouped.
 */
export class SalesforceAPI {
    private base(instanceUrl: string) {
        return `${instanceUrl.replace(/\/$/, '')}/services/data/${API_VERSION}`
    }

    private async request(
        token: string,
        instanceUrl: string,
        path: string,
        init: RequestInit = {}
    ) {
        const response = await fetch(`${this.base(instanceUrl)}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(init.headers || {})
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[salesforce] request failed:', path, response.status, errorText)
            throw new Error(`Salesforce API error ${response.status}: ${errorText}`)
        }

        if (response.status === 204) {
            return null
        }

        return response.json()
    }

    async getIdentity(token: string, identityUrl: string) {
        const response = await fetch(identityUrl, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) {
            throw new Error(`Salesforce identity lookup failed: ${response.status}`)
        }

        return response.json()
    }

    /** Campaigns act as the grouping target for meeting action items. */
    async getCampaigns(token: string, instanceUrl: string): Promise<SetupTarget[]> {
        const soql = encodeURIComponent(
            'SELECT Id, Name FROM Campaign ORDER BY CreatedDate DESC LIMIT 100'
        )

        const data = await this.request(token, instanceUrl, `/query?q=${soql}`)

        return (data?.records || []).map((record: any) => ({
            id: record.Id,
            name: record.Name
        }))
    }

    async createCampaign(token: string, instanceUrl: string, name: string) {
        const data = await this.request(token, instanceUrl, '/sobjects/Campaign', {
            method: 'POST',
            body: JSON.stringify({
                Name: name,
                IsActive: true,
                Description: 'Created by Recall AI to group meeting action items.'
            })
        })

        return { id: data.id as string, name }
    }

    async getCurrentUserId(token: string, instanceUrl: string): Promise<string | null> {
        const soql = encodeURIComponent('SELECT Id FROM User LIMIT 1')
        const data = await this.request(token, instanceUrl, `/query?q=${soql}`)
        return data?.records?.[0]?.Id ?? null
    }

    async createTask(
        token: string,
        instanceUrl: string,
        item: ActionItemData,
        campaignId?: string | null
    ) {
        const body: Record<string, unknown> = {
            Subject: item.title.slice(0, 255),
            Description: item.description || 'Action item captured from a meeting.',
            Status: 'Not Started',
            Priority: 'Normal'
        }

        if (item.dueDate) {
            body.ActivityDate = item.dueDate
        }

        if (campaignId) {
            body.WhatId = campaignId
        }

        return this.request(token, instanceUrl, '/sobjects/Task', {
            method: 'POST',
            body: JSON.stringify(body)
        })
    }
}
