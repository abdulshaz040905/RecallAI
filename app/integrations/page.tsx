'use client'

import { useMemo } from 'react'
import { useIntegrations } from './hooks/useIntegrations'
import SetupForm from './components/SetupForm'
import IntegrationCard from './components/IntegrationCard'
import { PageBody, PageHeader, Spinner } from '../components/page-shell'

const CATEGORY_ORDER = [
    'Calendar',
    'Docs & notes',
    'Project management',
    'CRM',
    'Chat'
] as const

const HOW_IT_WORKS = [
    'Connect the tools you want above — each one uses OAuth, so we never see your password.',
    'Pick a destination: a Notion database, Linear team, Jira project, Trello board, Salesforce campaign, HubSpot deal or Slack channel.',
    'Open any meeting, hover an action item and click “Add to”.',
    'Choose one or more tools — the task is created instantly with a link back to the meeting.'
]

export default function IntegrationsPage() {
    const {
        integrations,
        loading,
        setupMode,
        setSetupMode,
        setupData,
        setSetupData,
        setupLoading,
        fetchSetupData,
        handleConnect,
        handleDisconnect,
        handleSetupSubmit
    } = useIntegrations()

    const grouped = useMemo(() => {
        return CATEGORY_ORDER.map((category) => ({
            category,
            items: integrations.filter((integration) => integration.category === category)
        })).filter((group) => group.items.length > 0)
    }, [integrations])

    const connectedCount = integrations.filter((i) => i.connected).length

    const closeSetup = () => {
        setSetupMode(null)
        setSetupData(null)
        window.history.replaceState({}, '', '/integrations')
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner />
            </div>
        )
    }

    return (
        <>
            <PageHeader
                eyebrow="Connections"
                title="Integrations"
                description="Connect the tools your team already uses, then push action items straight into them."
                actions={
                    <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                        {connectedCount} / {integrations.length} connected
                    </span>
                }
            />

            <PageBody>
                {setupMode && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
                        onClick={closeSetup}
                    >
                        <div
                            className="w-full max-w-md rounded-[var(--radius)] border border-line bg-card p-6"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <p className="eyebrow mb-2.5">Setup</p>
                            <h2 className="font-display text-[22px] font-medium tracking-[-0.03em]">
                                {setupMode.charAt(0).toUpperCase() + setupMode.slice(1)}
                            </h2>
                            <p className="mb-6 mt-1.5 text-[13px] text-ink-soft">
                                Choose where new action items should land.
                            </p>

                            <SetupForm
                                platform={setupMode}
                                data={setupData}
                                onSubmit={handleSetupSubmit}
                                onCancel={closeSetup}
                                loading={setupLoading}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-12">
                    {grouped.map((group) => (
                        <section key={group.category}>
                            <div className="mb-5 flex items-center gap-3 border-b border-line pb-3">
                                <h2 className="eyebrow">{group.category}</h2>
                                <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                                    ({group.items.length})
                                </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {group.items.map((integration) => (
                                    <IntegrationCard
                                        key={integration.platform}
                                        integration={integration}
                                        onConnect={handleConnect}
                                        onDisconnect={handleDisconnect}
                                        onSetup={(platform) => {
                                            setSetupMode(platform)
                                            fetchSetupData(platform)
                                        }}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                <section className="mt-14 border-t border-line pt-10">
                    <h2 className="eyebrow mb-6">How this works</h2>
                    <ol className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
                        {HOW_IT_WORKS.map((step, index) => (
                            <li key={step} className="relative pt-5 lg:pr-6">
                                {index > 0 && (
                                    <span className="absolute left-0 top-0 hidden h-full w-px bg-line lg:block" />
                                )}
                                <span className={index > 0 ? 'block lg:pl-6' : 'block'}>
                                    <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <p className="mt-3 text-[13px] leading-[1.65] text-ink-soft">
                                        {step}
                                    </p>
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            </PageBody>
        </>
    )
}
