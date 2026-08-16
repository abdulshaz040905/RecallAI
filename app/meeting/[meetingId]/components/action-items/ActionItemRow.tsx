import Image from 'next/image'
import { Integration } from '../../hooks/useActionItems'
import { Button } from '@/components/ui/button'
import { ChevronDown, Trash2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface ActionItemRowProps {
    index: number
    item: { id: number; text: string }
    integrations: Integration[]
    loading: { [key: string]: boolean }
    addToIntegration: (platform: string, item: { id: number; text: string }) => void
    handleDeleteItem: (id: number) => void
}

export default function ActionItemRow({
    index,
    item,
    integrations,
    loading,
    addToIntegration,
    handleDeleteItem
}: ActionItemRowProps) {
    const hasIntegrations = integrations.length > 0

    return (
        <div className="group flex items-start gap-4 border-b border-line py-3.5">
            <span className="w-5 shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-ink-faint">
                {String(index + 1).padStart(2, '0')}
            </span>

            <p className="flex-1 text-[14px] leading-[1.6]">{item.text}</p>

            <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">
                {hasIntegrations &&
                    (integrations.length === 1 ? (
                        <Button
                            onClick={() => addToIntegration(integrations[0].platform, item)}
                            disabled={loading[`${integrations[0].platform}-${item.id}`]}
                            size="sm"
                            variant="outline"
                        >
                            {loading[`${integrations[0].platform}-${item.id}`]
                                ? 'Adding…'
                                : `Add to ${integrations[0].name}`}
                        </Button>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                    Add to
                                    <ChevronDown className="h-3 w-3" strokeWidth={1.8} />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="min-w-[170px]">
                                {integrations.map((integration) => (
                                    <DropdownMenuItem
                                        key={integration.platform}
                                        onClick={() => addToIntegration(integration.platform, item)}
                                        className="cursor-pointer gap-2.5"
                                    >
                                        <span className="relative h-4 w-4 shrink-0">
                                            <Image
                                                src={integration.logo}
                                                alt=""
                                                width={16}
                                                height={16}
                                                className="h-full w-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                }}
                                            />
                                        </span>
                                        <span className="text-[13px]">
                                            {loading[`${integration.platform}-${item.id}`]
                                                ? 'Adding…'
                                                : integration.name}
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ))}

                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete action item"
                    onClick={() => handleDeleteItem(item.id)}
                    className="h-8 w-8 text-ink-faint hover:bg-transparent hover:text-destructive"
                >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                </Button>
            </div>
        </div>
    )
}
