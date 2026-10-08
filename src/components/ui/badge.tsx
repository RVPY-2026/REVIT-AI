import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Pills (radius 999px). `soft` = accent pill (reference `.pill`).
// Status colors: use admin/StatusBadge, which maps statuses to these tones.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        soft: "border-border bg-primary-soft px-3.5 py-1 text-[13px] font-medium text-primary",
        outline: "border-border text-foreground",
        success: "border-current bg-transparent text-success",
        warning: "border-current bg-transparent text-warning",
        info: "border-current bg-transparent text-info",
        destructive: "border-current bg-transparent text-destructive",
        muted: "border-current bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
