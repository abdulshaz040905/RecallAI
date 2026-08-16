import { cn } from "@/lib/utils";
import { ComponentPropsWithoutRef } from "react";

/**
 * Kept as a thin wrapper so any stray import still compiles.
 *
 * The editorial design system has no animated gradients — headlines are solid
 * ink with an italic serif accent instead — so this renders plain emphasised
 * text rather than the old shifting gradient.
 */
export type AnimatedGradientTextProps = ComponentPropsWithoutRef<"span">;

export function AnimatedGradientText({
  children,
  className,
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span className={cn("serif-accent", className)} {...props}>
      {children}
    </span>
  );
}
