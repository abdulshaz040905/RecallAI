'use client'

import { useMeetingDetail } from './hooks/useMeetingDetail'
import MeetingHeader from './components/MeetingHeader'
import MeetingInfo from './components/MeetingInfo'
import ActionItems from './components/action-items/ActionItems'
import TranscriptDisplay from './components/TranscriptDisplay'
import ChatSidebar from './components/ChatSidebar'
import CustomAudioPlayer from './components/AudioPlayer'
import { useTranscriptTranslation } from './hooks/useTranscriptTranslation'
import LanguageSelector from './components/LanguageSelector'

const TABS = [
    { id: 'summary', label: 'Summary' },
    { id: 'transcript', label: 'Transcript' }
] as const

/** Centred status block used while data loads or the AI is still working. */
function Status({ title, hint }: { title: string; hint?: string }) {
    return (
        <div className="rounded-[var(--radius)] border border-dashed border-line-strong px-8 py-16 text-center">
            <p className="flex items-center justify-center gap-2.5 font-display text-[16px] font-medium tracking-[-0.02em]">
                <span className="h-1.5 w-1.5 rounded-full bg-vermilion live-dot" />
                {title}
            </p>
            {hint && <p className="mt-2 text-[13px] text-ink-soft">{hint}</p>}
        </div>
    )
}

export default function MeetingDetail() {
    const {
        meetingId,
        isOwner,
        userChecked,
        chatInput,
        messages,
        showSuggestions,
        activeTab,
        setActiveTab,
        meetingData,
        loading,
        handleSendMessage,
        handleSuggestionClick,
        handleInputChange,
        deleteActionItem,
        addActionItem,
        displayActionItems,
        meetingInfoData
    } = useMeetingDetail()

    const {
        language,
        loading: translating,
        availableLanguages,
        translatedSegments,
        translatedSummary,
        changeLanguage
    } = useTranscriptTranslation(meetingId)

    return (
        <div className="min-h-screen bg-paper">
            <MeetingHeader
                title={meetingData?.title || 'Meeting'}
                meetingId={meetingId}
                summary={meetingData?.summary}
                actionItems={
                    meetingData?.actionItems?.map((item) => `• ${item.text}`).join('\n') || ''
                }
                isOwner={isOwner}
                isLoading={!userChecked}
            />

            <div className="flex h-[calc(100vh-69px)]">
                <div
                    className={`flex-1 overflow-auto px-5 pb-28 pt-8 sm:px-8 ${
                        userChecked && !isOwner ? 'mx-auto max-w-4xl' : ''
                    }`}
                >
                    <MeetingInfo meetingData={meetingInfoData} />

                    {/* Tabs — an underline that slides, not a pill that pops. */}
                    <div className="mb-8 flex gap-7 border-b border-line">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative cursor-pointer pb-3 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                                    activeTab === tab.id
                                        ? 'text-ink'
                                        : 'text-ink-faint hover:text-ink-soft'
                                }`}
                            >
                                {tab.label}
                                <span
                                    className={`absolute inset-x-0 -bottom-px h-px origin-left bg-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                        activeTab === tab.id ? 'scale-x-100' : 'scale-x-0'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>

                    {activeTab === 'summary' && (
                        <div>
                            {loading ? (
                                <Status title="Loading meeting data…" />
                            ) : meetingData?.processed ? (
                                <div className="space-y-10">
                                    {meetingData.summary && (
                                        <section>
                                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                                                <h3 className="eyebrow">Summary</h3>
                                                <LanguageSelector
                                                    value={language}
                                                    onChange={changeLanguage}
                                                    loading={translating}
                                                    cachedLanguages={availableLanguages}
                                                />
                                            </div>
                                            <p className="max-w-[68ch] text-[16px] leading-[1.7] text-ink">
                                                {translatedSummary ?? meetingData.summary}
                                            </p>
                                        </section>
                                    )}

                                    {!userChecked ? (
                                        <div className="h-32 animate-pulse rounded-[10px] border border-line bg-paper-2" />
                                    ) : (
                                        <>
                                            {isOwner && displayActionItems.length > 0 && (
                                                <ActionItems
                                                    actionItems={displayActionItems}
                                                    onDeleteItem={deleteActionItem}
                                                    onAddItem={addActionItem}
                                                    meetingId={meetingId}
                                                />
                                            )}

                                            {!isOwner && displayActionItems.length > 0 && (
                                                <section>
                                                    <h3 className="eyebrow mb-4 border-b border-line pb-3">
                                                        Action items
                                                    </h3>
                                                    <ul>
                                                        {displayActionItems.map((item, i) => (
                                                            <li
                                                                key={item.id}
                                                                className="flex gap-4 border-b border-line py-3.5"
                                                            >
                                                                <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-ink-faint">
                                                                    {String(i + 1).padStart(2, '0')}
                                                                </span>
                                                                <span className="text-[14px] leading-relaxed">
                                                                    {item.text}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </section>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <Status
                                    title="Processing with AI…"
                                    hint="You'll get an email the moment it's ready."
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'transcript' && (
                        <div>
                            {loading ? (
                                <Status title="Loading meeting data…" />
                            ) : meetingData?.transcript ? (
                                <TranscriptDisplay
                                    transcript={meetingData.transcript}
                                    language={language}
                                    onLanguageChange={changeLanguage}
                                    translating={translating}
                                    translatedSegments={translatedSegments}
                                    availableLanguages={availableLanguages}
                                />
                            ) : (
                                <Status title="No transcript available" />
                            )}
                        </div>
                    )}
                </div>

                {!userChecked ? (
                    <div className="hidden w-[22rem] shrink-0 border-l border-line bg-card p-5 lg:block">
                        <div className="space-y-3">
                            <div className="h-4 w-1/2 animate-pulse rounded bg-paper-2" />
                            <div className="h-8 animate-pulse rounded bg-paper-2" />
                            <div className="h-8 animate-pulse rounded bg-paper-2" />
                        </div>
                    </div>
                ) : (
                    isOwner && (
                        <ChatSidebar
                            messages={messages}
                            chatInput={chatInput}
                            showSuggestions={showSuggestions}
                            onInputChange={handleInputChange}
                            onSendMessage={handleSendMessage}
                            onSuggestionClick={handleSuggestionClick}
                        />
                    )
                )}
            </div>

            <CustomAudioPlayer
                recordingUrl={meetingData?.recordingUrl}
                isOwner={isOwner}
            />
        </div>
    )
}
