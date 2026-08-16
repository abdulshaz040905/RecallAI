'use client'

import Image from 'next/image'
import { Check, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Integration } from '../hooks/useIntegrations'

interface IntegrationCardProps {
    integration: Integration
    onConnect: (platform: string) => void
    onDisconnect: (platform: string) => void
    onSetup: (platform: string) => void
}

function destinationFor(integration: Integration): string | null {
    switch (integration.platform) {
        case 'slack':
            return integration.channelName ? `#${integration.channelName}` : null
        case 'trello':
            return integration.boardName ?? null
        case 'google-calendar':
            return 'Auto-sync enabled'
        default:
            return integration.projectName ?? null
    }
}

export default function IntegrationCard({
    integration,
    onConnect,
    onDisconnect,
    onSetup
}: IntegrationCardProps) {
    const destination = destinationFor(integration)
    const needsSetup =
        integration.connected &&
        integration.platform !== 'google-calendar' &&
        !destination

    return (
        <div className="surface surface-hover flex flex-col p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line bg-paper-2">
                    <Image
                        src={integration.logo}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-contain p-1.5"
                    />
                </span>

                {integration.connected && (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                        <Check className="h-3 w-3" strokeWidth={2} />
                        Connected
                    </span>
                )}
            </div>

            <h3 className="font-display text-[16px] font-medium tracking-[-0.02em]">
                {integration.name}
            </h3>
            <p className="mb-5 mt-1.5 flex-1 text-[13px] leading-[1.6] text-ink-soft">
                {integration.description}
            </p>

            {integration.connected && (
                <div className="mb-4 border-t border-line pt-3">
                    {needsSetup ? (
                        <p className="text-[12px] text-vermilion">
                            Pick a {integration.targetLabel} to finish setup
                        </p>
                    ) : (
                        <>
                            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                                {integration.platform === 'google-calendar'
                                    ? 'Status'
                                    : 'Action items go to'}
                            </p>
                            <p className="mt-1 truncate text-[13px] font-medium">
                                {destination}
                            </p>
                        </>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                {integration.connected ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDisconnect(integration.platform)}
                            className="flex-1"
                            type="button"
                        >
                            Disconnect
                        </Button>

                        {integration.platform !== 'google-calendar' && (
                            <Button
                                variant={needsSetup ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onSetup(integration.platform)}
                                className="px-3"
                                type="button"
                                aria-label={`Configure ${integration.name}`}
                            >
                                <Settings2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                            </Button>
                        )}
                    </>
                ) : (
                    <Button
                        size="sm"
                        onClick={() => onConnect(integration.platform)}
                        className="flex-1"
                        type="button"
                    >
                        Connect
                    </Button>
                )}
            </div>
        </div>
    )
}
