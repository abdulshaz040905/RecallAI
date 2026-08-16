'use client'

import { CalendarRange, Check, Clock, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
    DATE_PRESETS,
    DURATION_PRESETS,
    type DatePreset,
    type DurationPreset,
    type MeetingSearchParams
} from '@/lib/meeting-filters'
import type { ParticipantOption } from '../../hooks/useMeetingSearch'

interface Props {
    filters: MeetingSearchParams
    participants: ParticipantOption[]
    activeFilterCount: number
    onDatePreset: (preset: DatePreset) => void
    onDuration: (duration: DurationPreset) => void
    onChange: <K extends keyof MeetingSearchParams>(
        key: K,
        value: MeetingSearchParams[K]
    ) => void
    onToggleParticipant: (name: string) => void
    onReset: () => void
}

export default function MeetingFilters({
    filters,
    participants,
    activeFilterCount,
    onDatePreset,
    onDuration,
    onChange,
    onToggleParticipant,
    onReset
}: Props) {
    const showCustomRange = filters.preset === 'custom'
    const selectedParticipants = filters.participants ?? []

    return (
        <div className="space-y-7">
            <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="eyebrow">Filters</h2>
                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex cursor-pointer items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint transition-colors hover:text-ink"
                    >
                        <X className="h-3 w-3" />
                        Clear {activeFilterCount}
                    </button>
                )}
            </div>

            {/* Date range ---------------------------------------------------- */}
            <div className="space-y-2.5">
                <Label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    <CalendarRange className="h-3.5 w-3.5" />
                    Date range
                </Label>

                <div className="flex flex-wrap gap-1.5">
                    {DATE_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => onDatePreset(preset.value)}
                            className={cn(
                                'cursor-pointer rounded-full border px-3 py-1 text-[11px] transition-colors duration-300',
                                filters.preset === preset.value
                                    ? 'border-ink bg-ink text-paper'
                                    : 'border-line text-ink-soft hover:border-line-strong hover:text-ink'
                            )}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {showCustomRange && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                            <Label htmlFor="from" className="text-[11px] text-ink-faint">
                                From
                            </Label>
                            <Input
                                id="from"
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(event) => onChange('from', event.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="to" className="text-[11px] text-ink-faint">
                                To
                            </Label>
                            <Input
                                id="to"
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(event) => onChange('to', event.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Duration ------------------------------------------------------ */}
            <div className="space-y-2.5">
                <Label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    <Clock className="h-3.5 w-3.5" />
                    Duration
                </Label>

                <div className="flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => onDuration(preset.value)}
                            className={cn(
                                'cursor-pointer rounded-full border px-3 py-1 text-[11px] transition-colors duration-300',
                                filters.duration === preset.value
                                    ? 'border-ink bg-ink text-paper'
                                    : 'border-line text-ink-soft hover:border-line-strong hover:text-ink'
                            )}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Participants -------------------------------------------------- */}
            <div className="space-y-2.5">
                <Label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    <Users className="h-3.5 w-3.5" />
                    Participants
                </Label>

                {participants.length === 0 ? (
                    <p className="text-[12px] text-ink-faint">
                        No participants recorded yet.
                    </p>
                ) : (
                    <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                        {participants.slice(0, 40).map((participant) => {
                            const selected = selectedParticipants.includes(participant.name)

                            return (
                                <button
                                    key={participant.name}
                                    type="button"
                                    onClick={() => onToggleParticipant(participant.name)}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                                        selected
                                            ? 'bg-paper-2 text-ink'
                                            : 'text-ink-soft hover:bg-paper-2 hover:text-ink'
                                    )}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span
                                            className={cn(
                                                'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                                                selected
                                                    ? 'border-ink bg-ink'
                                                    : 'border-line-strong'
                                            )}
                                        >
                                            {selected && <Check className="h-3 w-3 text-paper" />}
                                        </span>
                                        <span className="truncate">{participant.name}</span>
                                    </span>
                                    <span className="shrink-0 tabular-nums opacity-60">
                                        {participant.count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Sort ---------------------------------------------------------- */}
            <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Sort by</Label>
                <Select
                    value={filters.sort ?? 'newest'}
                    onValueChange={(value) =>
                        onChange('sort', value as MeetingSearchParams['sort'])
                    }
                >
                    <SelectTrigger className="w-full text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="oldest">Oldest first</SelectItem>
                        <SelectItem value="longest">Longest first</SelectItem>
                        <SelectItem value="shortest">Shortest first</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {activeFilterCount > 0 && (
                <Button
                    variant="outline"
                    onClick={onReset}
                    size="sm"
                    className="w-full"
                >
                    Reset all filters
                </Button>
            )}
        </div>
    )
}
