import { disconnectIntegration } from '@/lib/integrations/disconnect'

export async function POST() {
    return disconnectIntegration('hubspot')
}
