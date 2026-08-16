"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors duration-300 outline-none data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=unchecked]:border-line-strong data-[state=unchecked]:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3 rounded-full ring-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=checked]:translate-x-[15px] data-[state=checked]:bg-paper data-[state=unchecked]:translate-x-[2px] data-[state=unchecked]:bg-ink-faint"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
