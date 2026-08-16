'use client'

import useChatAll from './hooks/useChatAll'
import ChatSuggestions from './components/ChatSuggestions'
import ChatMessages from './components/ChatMessages'
import ChatInput from './components/ChatInput'
import { PageHeader } from '../components/page-shell'

export default function Chat() {
    const {
        chatInput,
        messages,
        showSuggestions,
        isLoading,
        chatSuggestions,
        handleSendMessage,
        handleSuggestionClick,
        handleInputChange
    } = useChatAll()

    return (
        <div className="flex h-full min-h-screen flex-col">
            <PageHeader
                eyebrow="Chat"
                title="Ask your meetings"
                description="Search across every call you have recorded. Answers cite the meetings they came from."
            />

            <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-5 sm:px-8">
                <div className="flex-1 overflow-auto py-8">
                    {messages.length === 0 && showSuggestions ? (
                        <ChatSuggestions
                            suggestions={chatSuggestions}
                            onSuggestionClick={handleSuggestionClick}
                        />
                    ) : (
                        <ChatMessages messages={messages} isLoading={isLoading} />
                    )}
                </div>

                <ChatInput
                    chatInput={chatInput}
                    onInputChange={handleInputChange}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}
