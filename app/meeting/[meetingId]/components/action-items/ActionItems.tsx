import { ActionItem, useActionItems } from '../../hooks/useActionItems'
import ActionItemsList from './ActionItemsList'
import AddActionItemInput from './AddActionItemInput'
import { toast } from 'sonner'

export interface ActionItemsProps {
    actionItems: ActionItem[]
    onDeleteItem: (id: number) => void
    onAddItem: (text: string) => void
    meetingId: string
}

function ActionItems({
    actionItems,
    onDeleteItem,
    onAddItem,
    meetingId
}: ActionItemsProps) {
    const {
        integrations,
        integrationsLoaded,
        loading,
        setLoading,
        showAddInput,
        setShowAddInput,
        newItemText,
        setNewItemText
    } = useActionItems(meetingId)

    const addToIntegration = async (platform: string, actionItem: ActionItem) => {
        setLoading(prev => ({ ...prev, [`${platform}-${actionItem.id}`]: true }))
        try {
            toast(`Action item added to ${platform}`)
            await fetch('/api/integrations/action-items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    platform,
                    actionItem: actionItem.text,
                    meetingId
                })
            })
        } finally {
            setLoading(prev => ({ ...prev, [`${platform}-${actionItem.id}`]: false }))
        }
    }

    const handleAddNewItem = async () => {
        if (!newItemText.trim()) {
            return
        }

        try {
            toast('Action item added')
            const response = await fetch(`/api/meetings/${meetingId}/action-items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: newItemText
                })
            })

            if (response.ok) {
                onAddItem(newItemText)
                setNewItemText('')
                setShowAddInput(false)
            }
        } catch (error) {
            console.error('failed to add action item:', error)
        }
    }

    const handleDeleteItem = async (id: number) => {
        try {
            toast('Action item deleted')
            const response = await fetch(`/api/meetings/${meetingId}/action-items/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                onDeleteItem(id)
            }
        } catch (error) {
            console.error('failed to delete action item:', error)
        }
    }

    const hasConnectedIntegrations = integrations.length > 0

    if (!integrationsLoaded) {
        return (
            <section>
                <h3 className='eyebrow mb-4 border-b border-line pb-3'>Action items</h3>

                <div>
                    {actionItems.map((item, index) => (
                        <div key={item.id} className='flex items-start gap-4 border-b border-line py-3.5'>
                            <span className='w-5 shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-ink-faint'>
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <p className='flex-1 text-[14px] leading-[1.6]'>{item.text}</p>
                            <span className='h-5 w-20 shrink-0 animate-pulse rounded-full bg-paper-2' />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    return (
        <section>
            <h3 className='eyebrow mb-4 border-b border-line pb-3'>Action items</h3>

            <ActionItemsList
                actionItems={actionItems}
                integrations={integrations}
                loading={loading}
                addToIntegration={addToIntegration}
                handleDeleteItem={handleDeleteItem}
            />

            <AddActionItemInput
                showAddInput={showAddInput}
                setShowAddInput={setShowAddInput}
                newItemText={newItemText}
                setNewItemText={setNewItemText}
                onAddItem={handleAddNewItem}
            />

            {!hasConnectedIntegrations && actionItems.length > 0 && (
                <p className='mt-4 border-t border-line pt-4 text-[12px] text-ink-faint'>
                    <a href='/integrations' className='link-underline text-ink'>
                        Connect an integration
                    </a>{' '}
                    to push these into your tools.
                </p>
            )}
        </section>
    )
}

export default ActionItems
