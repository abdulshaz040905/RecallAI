import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

interface AddActionItemInputProps {
    showAddInput: boolean
    setShowAddInput: (show: boolean) => void
    newItemText: string
    setNewItemText: (text: string) => void
    onAddItem: () => void
}

export default function AddActionItemInput({
    showAddInput,
    setShowAddInput,
    newItemText,
    setNewItemText,
    onAddItem
}: AddActionItemInputProps) {
    if (showAddInput) {
        return (
            <div className="flex items-center gap-2 pt-4">
                <Input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="What needs doing?"
                    className="flex-1"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onAddItem()
                        if (e.key === 'Escape') {
                            setShowAddInput(false)
                            setNewItemText('')
                        }
                    }}
                    autoFocus
                />
                <Button onClick={onAddItem} disabled={!newItemText.trim()} size="sm">
                    Add
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setShowAddInput(false)
                        setNewItemText('')
                    }}
                >
                    Cancel
                </Button>
            </div>
        )
    }

    return (
        <button
            type="button"
            onClick={() => setShowAddInput(true)}
            className="flex w-full cursor-pointer items-center gap-2.5 py-3.5 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink"
        >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
            Add action item
        </button>
    )
}
