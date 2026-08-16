import { useUsage } from '@/app/contexts/UsageContext'
import { Input } from '@/components/ui/input'
import { ArrowUp } from 'lucide-react'

interface ChatInputProps {
    chatInput: string
    onInputChange: (value: string) => void
    onSendMessage: () => void
    isLoading: boolean
}

export default function ChatInput({
    chatInput,
    onInputChange,
    onSendMessage,
    isLoading
}: ChatInputProps) {
    const { canChat, usage, limits } = useUsage()

    return (
        <div className="sticky bottom-0 bg-paper pb-8 pt-4">
            {!canChat && usage && (
                <div className="mb-3 rounded-[10px] border border-line bg-card px-4 py-3 text-center text-[13px] text-ink-soft">
                    Daily limit reached ({usage.chatMessagesToday}/{limits.chatMessages}{' '}
                    messages).{' '}
                    <a href="/pricing" className="link-underline text-ink">
                        Upgrade your plan
                    </a>{' '}
                    to keep chatting.
                </div>
            )}

            <div className="relative">
                <Input
                    type="text"
                    value={chatInput}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
                    placeholder={
                        canChat
                            ? 'Ask about deadlines, decisions, action items, people…'
                            : 'Daily chat limit reached'
                    }
                    className="h-13 pr-14 text-[14px]"
                    disabled={isLoading || !canChat}
                />

                <button
                    type="button"
                    onClick={onSendMessage}
                    disabled={isLoading || !canChat || !chatInput.trim()}
                    aria-label="Send message"
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity duration-300 hover:opacity-85 disabled:pointer-events-none disabled:opacity-25"
                >
                    <ArrowUp className="h-4 w-4" strokeWidth={2} />
                </button>
            </div>
        </div>
    )
}
