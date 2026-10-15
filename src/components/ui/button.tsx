import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// FRONTEND_RULES §5: `default` = gradient + shadow (one per view section),
// `outline` = 1px border, `ghost` for toolbar actions. Radius 10px (§3.3).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-medium whitespace-nowrap transition-[filter,box-shadow,background-color,border-color,color] duration-200 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary-gradient font-semibold text-primary-foreground shadow-primary hover:brightness-108 hover:shadow-[0_10px_30px_-8px_var(--primary)]",
        outline:
          "border-border bg-transparent hover:border-primary hover:bg-primary-soft aria-expanded:border-primary aria-expanded:bg-primary-soft",
        secondary: "bg-secondary text-secondary-foreground hover:bg-primary-soft",
        ghost: "text-muted-foreground hover:bg-primary-soft hover:text-foreground aria-expanded:bg-primary-soft",
        destructive:
          "border-destructive/40 text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5.5 text-[15px]",
        sm: "h-9 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        compact: "h-11 md:h-9 [@media(pointer:coarse)]:h-11 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-compact": "size-11 md:size-9 [@media(pointer:coarse)]:size-11 [&_svg:not([class*='size-'])]:size-4",
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
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
