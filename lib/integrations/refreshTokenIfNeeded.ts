import { UserIntegration } from '@prisma/client'
import { refreshJiraToken } from './jira/refreshToken'
import { refreshSalesforceToken } from './salesforce/refreshToken'
import { REFRESH_SKEW_MS, shouldRefresh } from './token-expiry'

export { REFRESH_SKEW_MS, shouldRefresh }

/**
 * Returns the integration with a fresh access token, refreshing first if the
 * stored one is expired or about to be. Platforms whose tokens do not expire
 * (Notion, Trello, Slack, Linear) are returned untouched.
 */
export async function refreshTokenIfNeeded(integration: UserIntegration) {
    if (!shouldRefresh(integration.platform, integration.expiresAt)) {
        return integration
    }

    switch (integration.platform) {
        case 'jira':
            return refreshJiraToken(integration)
        case 'salesforce':
            return refreshSalesforceToken(integration)
        default:
            return integration
    }
}
