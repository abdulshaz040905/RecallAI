interface Message {
    id: number
    content: string
    isBot: boolean
    timestamp: Date
}

interface ChatMessagesProps {
    messages: Message[]
    isLoading: boolean
}

export default function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
    return (
        <div className="space-y-7">
            {messages.map((message) => (
                <div key={message.id}>
                    <p className="eyebrow mb-2.5">{message.isBot ? 'Recall' : 'You'}</p>

                    {message.isBot ? (
                        <p className="max-w-[62ch] whitespace-pre-wrap text-[15px] leading-[1.7] text-ink">
                            {message.content}
                        </p>
                    ) : (
                        <p className="max-w-[62ch] whitespace-pre-wrap border-l-2 border-ink pl-4 text-[15px] leading-[1.7] text-ink-soft">
                            {message.content}
                        </p>
                    )}
                </div>
            ))}

            {isLoading && (
                <div>
                    <p className="eyebrow mb-2.5">Recall</p>
                    <p className="flex items-center gap-2.5 text-[15px] text-ink-faint">
                        <span className="h-1.5 w-1.5 rounded-full bg-vermilion live-dot" />
                        Searching through your meetings…
                    </p>
                </div>
            )}
        </div>
    )
}
