interface ChatSuggestionsProps {
    suggestions: string[]
    onSuggestionClick: (suggestion: string) => void
}

export default function ChatSuggestions({
    suggestions,
    onSuggestionClick
}: ChatSuggestionsProps) {
    return (
        <div className="flex h-full flex-col justify-center py-10">
            <p className="eyebrow mb-4">Try one of these</p>

            <ul className="border-t border-line">
                {suggestions.map((suggestion, index) => (
                    <li key={index} className="border-b border-line">
                        <button
                            type="button"
                            onClick={() => onSuggestionClick(suggestion)}
                            className="group flex w-full cursor-pointer items-center gap-4 py-4 text-left transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:pl-2"
                        >
                            <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="flex-1 font-display text-[16px] tracking-[-0.02em] text-ink-soft transition-colors group-hover:text-ink sm:text-[18px]">
                                {suggestion}
                            </span>
                            <span className="font-mono text-[12px] text-ink-faint opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                →
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}
