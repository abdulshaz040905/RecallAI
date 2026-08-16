'use client'

import { useMemo, useState } from 'react'
import { Check, Globe, Loader2, Search } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { LANGUAGES, getLanguage, searchLanguages } from '@/lib/languages'

interface Props {
    value: string
    onChange: (code: string) => void
    loading?: boolean
    /** Languages already translated & cached, shown with a dot. */
    cachedLanguages?: string[]
}

/**
 * Searchable dropdown over all 130+ Google Translate languages.
 * Native names are shown so a reader recognises their own language.
 */
export default function LanguageSelector({
    value,
    onChange,
    loading = false,
    cachedLanguages = []
}: Props) {
    const [open, setOpen] = useState(false)
    const [term, setTerm] = useState('')

    const results = useMemo(() => searchLanguages(term), [term])
    const selected = getLanguage(value)

    return (
        <DropdownMenu
            open={open}
            onOpenChange={(next) => {
                setOpen(next)
                if (!next) setTerm('')
            }}
        >
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    disabled={loading}
                    className={cn(
                        'flex h-8 cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 text-[12px] transition-colors hover:border-line-strong',
                        loading && 'cursor-wait opacity-60'
                    )}
                >
                    {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Globe className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.6} />
                    )}
                    <span className="font-medium">{selected?.nativeName ?? value}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                        {LANGUAGES.length}+
                    </span>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 rounded-[12px] p-0">
                <div className="border-b border-line p-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" strokeWidth={1.6} />
                        <Input
                            autoFocus
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            placeholder="Search languages…"
                            className="h-9 pl-9 text-[13px]"
                        />
                    </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-1">
                    {results.length === 0 ? (
                        <p className="p-4 text-center text-[12px] text-ink-faint">
                            No language matches “{term}”.
                        </p>
                    ) : (
                        results.map((language) => {
                            const isSelected = language.code === value
                            const isCached = cachedLanguages.includes(language.code)

                            return (
                                <button
                                    key={language.code}
                                    type="button"
                                    onClick={() => {
                                        onChange(language.code)
                                        setOpen(false)
                                        setTerm('')
                                    }}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                                        isSelected ? 'bg-paper-2 text-ink' : 'hover:bg-paper-2'
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate">{language.nativeName}</span>
                                        <span className="block truncate text-[11px] text-ink-faint">
                                            {language.name}
                                        </span>
                                    </span>

                                    {isCached && !isSelected && (
                                        <span
                                            title="Already translated"
                                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion"
                                        />
                                    )}

                                    {isSelected && (
                                        <Check className="h-3.5 w-3.5 shrink-0 text-ink" strokeWidth={2} />
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
