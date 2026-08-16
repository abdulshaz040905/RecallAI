import { useUsage } from '@/app/contexts/UsageContext'
import { Input } from '@/components/ui/input'
import { ArrowUp } from 'lucide-react'

interface Message {
    id: number
    content: string
    isBot: boolean
    timestamp: Date
}

interface ChatSidebarProps {
    messages: Message[]
    chatInput: string
    showSuggestions: boolean
    onInputChange: (value: string) => void
    onSendMessage: () => void
    onSuggestionClick: (suggestion: string) => void
}

const CHAT_SUGGESTIONS = [
    'What deadlines were discussed?',
    'Write a follow-up email for the team',
    'What was I asked to do?',
    'Summarise the key action items'
]

export default function ChatSidebar({
    messages,
    chatInput,
    showSuggestions,
    onInputChange,
    onSendMessage,
    onSuggestionClick
}: ChatSidebarProps) {
    const { canChat } = useUsage()

    return (
        <aside className="hidden w-[22rem] shrink-0 flex-col border-l border-line bg-card lg:flex">
            <div className="border-b border-line px-5 py-[18px]">
                <p className="eyebrow mb-1.5">Assistant</p>
                <p className="font-display text-[15px] font-medium tracking-[-0.02em]">
                    Ask about this meeting
                </p>
            </div>

            <div className="flex-1 space-y-6 overflow-auto px-5 py-6">
                {messages.map((message) => (
                    <div key={message.id}>
                        <p className="eyebrow mb-2">{message.isBot ? 'Recall' : 'You'}</p>
                        <p
                            className={
                                message.isBot
                                    ? 'whitespace-pre-wrap text-[13.5px] leading-[1.65] text-ink'
                                    : 'whitespace-pre-wrap border-l-2 border-ink pl-3 text-[13.5px] leading-[1.65] text-ink-soft'
                            }
                        >
                            {message.content}
                        </p>
                    </div>
                ))}

                {messages.length > 0 && !messages[messages.length - 1].isBot && (
                    <div>
                        <p className="eyebrow mb-2">Recall</p>
                        <p className="flex items-center gap-2 text-[13.5px] text-ink-faint">
                            <span className="h-1.5 w-1.5 rounded-full bg-vermilion live-dot" />
                            Thinking…
                        </p>
                    </div>
                )}

                {showSuggestions && messages.length === 0 && (
                    <ul className="border-t border-line">
                        {CHAT_SUGGESTIONS.map((suggestion, index) => (
                            <li key={index} className="border-b border-line">
                                <button
                                    type="button"
                                    onClick={() => onSuggestionClick(suggestion)}
                                    disabled={!canChat}
                                    className="group flex w-full cursor-pointer items-center gap-3 py-3 text-left transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:pl-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="flex-1 text-[13px] leading-snug text-ink-soft transition-colors group-hover:text-ink">
                                        {suggestion}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {!canChat && (
                    <p className="text-center text-[12px] text-ink-faint">
                        Daily chat limit reached.{' '}
                        <a href="/pricing" className="link-underline text-ink">
                            Upgrade
                        </a>{' '}
                        to keep going.
                    </p>
                )}
            </div>

            <div className="border-t border-line p-4">
                <div className="relative">
                    <Input
                        type="text"
                        value={chatInput}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                onSendMessage()
                            }
                        }}
                        placeholder={
                            canChat ? 'Ask about this meeting…' : 'Daily limit reached'
                        }
                        className="h-11 pr-12 text-[13px]"
                        disabled={!canChat}
                    />

                    <button
                        type="button"
                        onClick={onSendMessage}
                        disabled={!chatInput.trim() || !canChat}
                        aria-label="Send message"
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity duration-300 hover:opacity-85 disabled:pointer-events-none disabled:opacity-25"
                    >
                        <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                </div>
            </div>
        </aside>
    )
}
