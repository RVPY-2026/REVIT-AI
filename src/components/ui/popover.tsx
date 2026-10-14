"use client";

import type { ComponentProps } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "cn";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({ className, align = "start", sideOffset = 8, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      data-slot="popover-content"
      align={align}
      sideOffset={sideOffset}
      collisionPadding={16}
      className={cn("z-50 max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-32px)] origin-(--radix-popover-content-transform-origin) overflow-y-auto rounded-2xl border border-border bg-popover p-4 text-popover-foreground outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:duration-200 data-open:ease-out data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:duration-150 data-closed:ease-in motion-reduce:animate-none", className)}
      {...props}
    />
  </PopoverPrimitive.Portal>;
}
