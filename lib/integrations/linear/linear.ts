import { ActionItemData, SetupTarget } from '../types'

/**
 * Linear only exposes a GraphQL API. We keep the query surface tiny: list
 * teams, create a team, create an issue.
 */
export class LinearAPI {
    private endpoint = 'https://api.linear.app/graphql'

    private async gql<T>(
        token: string,
        query: string,
        variables: Record<string, unknown> = {}
    ): Promise<T> {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        })

        const payload = await response.json()

        if (!response.ok || payload.errors) {
            const message =
                payload?.errors?.map((e: any) => e.message).join('; ') ||
                `HTTP ${response.status}`
            console.error('[linear] GraphQL error:', message)
            throw new Error(`Linear API error: ${message}`)
        }

        return payload.data as T
    }

    async getViewer(token: string) {
        const data = await this.gql<{
            viewer: { id: string; name: string; email: string }
        }>(token, `query { viewer { id name email } }`)

        return data.viewer
    }

    async getTeams(token: string): Promise<SetupTarget[]> {
        const data = await this.gql<{
            teams: { nodes: Array<{ id: string; name: string; key: string }> }
        }>(token, `query { teams(first: 100) { nodes { id name key } } }`)

        return data.teams.nodes.map((team) => ({
            id: team.id,
            name: team.name,
            key: team.key
        }))
    }

    async createTeam(token: string, name: string) {
        const key = name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 5) || 'TEAM'

        const data = await this.gql<{
            teamCreate: { success: boolean; team: { id: string; name: string; key: string } }
        }>(
            token,
            `mutation CreateTeam($input: TeamCreateInput!) {
                teamCreate(input: $input) {
                    success
                    team { id name key }
                }
            }`,
            { input: { name, key } }
        )

        if (!data.teamCreate.success) {
            throw new Error('Linear rejected the team creation request')
        }

        return data.teamCreate.team
    }

    async createIssue(token: string, teamId: string, item: ActionItemData) {
        const data = await this.gql<{
            issueCreate: {
                success: boolean
                issue: { id: string; identifier: string; url: string }
            }
        }>(
            token,
            `mutation CreateIssue($input: IssueCreateInput!) {
                issueCreate(input: $input) {
                    success
                    issue { id identifier url }
                }
            }`,
            {
                input: {
                    teamId,
                    title: item.title.slice(0, 255),
                    description: item.description || 'Action item captured from a meeting.',
                    ...(item.dueDate ? { dueDate: item.dueDate } : {})
                }
            }
        )

        if (!data.issueCreate.success) {
            throw new Error('Linear rejected the issue creation request')
        }

        return data.issueCreate.issue
    }
}
