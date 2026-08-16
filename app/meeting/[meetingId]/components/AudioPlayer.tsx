'use client'

import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useRef, useState } from 'react'
import AudioPlayer from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'

interface CustomAudioPlayerProps {
    recordingUrl?: string
    isOwner?: boolean
}

type PlayerHandle = { audio?: { current?: HTMLAudioElement | null } }

function formatTime(seconds: number) {
    if (Number.isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function CustomAudioPlayer({
    recordingUrl,
    isOwner = true
}: CustomAudioPlayerProps) {
    const playerRef = useRef<PlayerHandle | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(0.75)

    if (!recordingUrl) return null

    const audioEl = () => playerRef.current?.audio?.current ?? null

    const handlePlayPause = () => {
        const audio = audioEl()
        if (!audio) return
        if (isPlaying) audio.pause()
        else void audio.play()
    }

    const skip = (delta: number) => {
        const audio = audioEl()
        if (!audio) return
        audio.currentTime = Math.min(
            Math.max(0, audio.currentTime + delta),
            duration || audio.duration || 0
        )
    }

    const seek = (event: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioEl()
        if (!audio || !duration) return
        const rect = event.currentTarget.getBoundingClientRect()
        audio.currentTime = ((event.clientX - rect.left) / rect.width) * duration
    }

    const changeVolume = (event: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioEl()
        if (!audio) return
        const rect = event.currentTarget.getBoundingClientRect()
        const next = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
        audio.volume = next
        setVolume(next)
    }

    // The bar sits above the mobile tab bar on small screens, and flush to the
    // bottom once that bar is gone.
    return (
        <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-line bg-card/95 px-5 py-3.5 backdrop-blur-xl sm:px-8 md:bottom-0">
            <div style={{ display: 'none' }}>
                <AudioPlayer
                    ref={playerRef as never}
                    src={recordingUrl}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onListen={(e) => {
                        const audio = e.target as HTMLAudioElement
                        if (audio?.currentTime) setCurrentTime(audio.currentTime)
                    }}
                    onLoadedMetaData={(e) => {
                        const audio = e.target as HTMLAudioElement
                        if (audio?.duration) setDuration(audio.duration)
                    }}
                    volume={volume}
                    hasDefaultKeyBindings
                    autoPlayAfterSrcChange={false}
                    showSkipControls={false}
                    showJumpControls={false}
                    showDownloadProgress={false}
                    showFilledProgress={false}
                />
            </div>

            <div className={isOwner ? '' : 'mx-auto max-w-4xl'}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => skip(-10)}
                            aria-label="Back 10 seconds"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                        >
                            <SkipBack className="h-3.5 w-3.5" strokeWidth={1.6} />
                        </button>

                        <button
                            type="button"
                            onClick={handlePlayPause}
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-85"
                        >
                            {isPlaying ? (
                                <Pause className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                            ) : (
                                <Play className="ml-0.5 h-4 w-4" fill="currentColor" strokeWidth={0} />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => skip(10)}
                            aria-label="Forward 10 seconds"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                        >
                            <SkipForward className="h-3.5 w-3.5" strokeWidth={1.6} />
                        </button>
                    </div>

                    <span className="w-10 shrink-0 font-mono text-[10px] tabular-nums text-ink-faint">
                        {formatTime(currentTime)}
                    </span>

                    {/* Hairline scrubber — 2px, not a chunky pill. */}
                    <div
                        className="group flex h-4 flex-1 cursor-pointer items-center"
                        onClick={seek}
                    >
                        <div className="h-[2px] w-full bg-line">
                            <div
                                className="h-full bg-ink"
                                style={{
                                    width: `${duration ? (currentTime / duration) * 100 : 0}%`
                                }}
                            />
                        </div>
                    </div>

                    <span className="w-10 shrink-0 font-mono text-[10px] tabular-nums text-ink-faint">
                        {formatTime(duration)}
                    </span>

                    <div className="hidden items-center gap-2 sm:flex">
                        <Volume2 className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.6} />
                        <div
                            className="flex h-4 w-16 cursor-pointer items-center"
                            onClick={changeVolume}
                        >
                            <div className="h-[2px] w-full bg-line">
                                <div
                                    className="h-full bg-ink"
                                    style={{ width: `${volume * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint lg:block">
                        Recording
                    </span>
                </div>
            </div>
        </div>
    )
}
