'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'

interface SetupFormProps {
    platform: string
    data: any
    onSubmit: (platform: string, config: any) => void
    onCancel: () => void
    loading: boolean
}

/** What the destination is called for each platform. */
const TARGET_LABELS: Record<string, string> = {
    trello: 'board',
    slack: 'channel',
    jira: 'project',
    asana: 'project',
    notion: 'database',
    linear: 'team',
    salesforce: 'campaign',
    hubspot: 'deal'
}

/**
 * Which request key the API expects. Notion/Linear/Salesforce/HubSpot all
 * normalise onto `projectId`/`projectName` server-side, so we only special-case
 * Trello (boards) and Slack (channels).
 */
function payloadKeys(platform: string) {
    if (platform === 'trello') return { id: 'boardId', name: 'boardName' }
    if (platform === 'slack') return { id: 'channelId', name: 'channelName' }
    return { id: 'projectId', name: 'projectName' }
}

export default function SetupForm({
    platform,
    data,
    onSubmit,
    onCancel,
    loading
}: SetupFormProps) {
    const [selectedId, setSelectedId] = useState('')
    const [selectedName, setSelectedName] = useState('')
    const [createNew, setCreateNew] = useState(false)
    const [newName, setNewName] = useState('')
    const [parentPageId, setParentPageId] = useState('')

    const label = TARGET_LABELS[platform] ?? 'destination'

    const items = useMemo(() => {
        if (!data) return []

        return (
            data.boards ??
            data.channels ??
            data.databases ??
            data.teams ??
            data.campaigns ??
            data.deals ??
            data.projects ??
            []
        )
    }, [data])

    const optional = data?.optional === true
    const isLoadingOptions = data === null || data === undefined

    // Notion needs a parent page to create a database inside.
    const notionPages = platform === 'notion' ? (data?.pages ?? []) : []

    const handleSubmit = () => {
        const keys = payloadKeys(platform)

        if (createNew) {
            onSubmit(platform, {
                createNew: true,
                [keys.name]: newName,
                projectName: newName,
                ...(platform === 'notion' && parentPageId ? { parentPageId } : {}),
                workspaceId: data?.workspaceId
            })
            return
        }

        onSubmit(platform, {
            [keys.id]: selectedId,
            [keys.name]: selectedName,
            projectId: selectedId,
            projectName: selectedName,
            // Jira uses the project key as its identifier.
            projectKey: selectedId,
            workspaceId: data?.workspaceId
        })
    }

    const submitDisabled =
        loading ||
        (createNew && !newName.trim()) ||
        (!createNew && !selectedId && !optional)

    return (
        <div>
            <div className="mb-4">
                <Label className="mb-2 block text-sm font-medium">
                    Where should action items go?
                </Label>

                {isLoadingOptions ? (
                    <div className="flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[13px] text-ink-soft">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading your {label}s…
                    </div>
                ) : !createNew ? (
                    <Select
                        value={selectedId}
                        onValueChange={(value) => {
                            const selected = items.find(
                                (item: any) =>
                                    item.id === value || item.key === value || item.gid === value
                            )
                            setSelectedId(value)
                            setSelectedName(selected?.name ?? '')
                        }}
                    >
                        <SelectTrigger className="w-full rounded-xl">
                            <SelectValue
                                placeholder={
                                    items.length
                                        ? `Choose an existing ${label}…`
                                        : `No ${label}s found`
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>
                                    {label.charAt(0).toUpperCase() + label.slice(1)}s
                                </SelectLabel>
                                {items.map((item: any) => (
                                    <SelectItem
                                        key={item.id || item.key || item.gid}
                                        value={item.id || item.key || item.gid}
                                    >
                                        {item.name}
                                        {item.key ? ` (${item.key})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="space-y-3">
                        <Input
                            type="text"
                            value={newName}
                            onChange={(event) => setNewName(event.target.value)}
                            placeholder={`Enter a new ${label} name…`}
                            className="rounded-xl"
                        />

                        {platform === 'notion' && notionPages.length > 0 && (
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Create it inside this page
                                </Label>
                                <Select value={parentPageId} onValueChange={setParentPageId}>
                                    <SelectTrigger className="w-full rounded-xl">
                                        <SelectValue placeholder="Choose a parent page…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {notionPages.map((page: any) => (
                                            <SelectItem key={page.id} value={page.id}>
                                                {page.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                )}

                {optional && !createNew && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Optional — leave empty to create standalone tasks.
                    </p>
                )}
            </div>

            {platform !== 'slack' && (
                <div className="mb-6 flex items-center gap-2 text-sm">
                    <Checkbox
                        id="create-new"
                        checked={createNew}
                        onCheckedChange={(checked) => setCreateNew(!!checked)}
                    />
                    <Label htmlFor="create-new" className="cursor-pointer">
                        Create a new {label} instead
                    </Label>
                </div>
            )}

            <div className="flex gap-3">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1 cursor-pointer rounded-xl"
                    type="button"
                >
                    Cancel
                </Button>

                <Button
                    onClick={handleSubmit}
                    disabled={submitDisabled}
                    className="flex-1 cursor-pointer rounded-xl"
                    type="button"
                >
                    {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Save
                </Button>
            </div>
        </div>
    )
}
