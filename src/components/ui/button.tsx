import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        /* HYPERGLASS primary: glossy pill that flips black↔white with the theme */
        default:
          "bg-primary text-primary-foreground border border-black/10 dark:border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.18),0_6px_18px_-4px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.2),0_10px_26px_-6px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-[1.15] dark:hover:brightness-[0.92]",
        destructive:
          "bg-gradient-to-b from-[#eb5757] to-[#e03e3e] text-white border border-white/20 shadow-[0_1px_2px_rgba(15,15,15,0.12),0_4px_14px_-2px_rgba(224,62,62,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-[1.07] focus-visible:ring-destructive/30",
        /* Frosted glass outline */
        outline:
          "glass-surface border-border/80 text-foreground shadow-xs hover:bg-black/[0.04] hover:border-foreground/25 dark:hover:bg-white/[0.06]",
        /* Soft frosted secondary */
        secondary:
          "glass-surface bg-secondary/70 text-secondary-foreground shadow-xs hover:bg-secondary dark:bg-secondary/60",
        ghost:
          "hover:bg-accent/70 hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-11 px-7 has-[>svg]:px-5",
        icon: "size-9 rounded-full",
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
