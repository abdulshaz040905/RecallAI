import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Editorial buttons: pill geometry, solid ink or hairline outline, no
 * gradients or glow. Hover moves colour and a 1px border — nothing that
 * triggers layout.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13px] font-medium tracking-[-0.01em] cursor-pointer select-none transition-[background-color,color,border-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-paper hover:bg-ink/85",
        accent:
          "bg-vermilion hover:opacity-90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-line-strong bg-transparent text-ink hover:bg-ink hover:text-paper hover:border-ink",
        secondary:
          "bg-paper-2 text-ink hover:bg-paper-3",
        ghost:
          "text-ink-soft hover:bg-paper-2 hover:text-ink",
        link:
          "text-ink underline-offset-4 hover:underline px-0 h-auto rounded-none",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-[12px] gap-1.5",
        lg: "h-12 px-7 text-[14px]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
