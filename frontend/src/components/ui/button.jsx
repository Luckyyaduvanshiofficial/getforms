// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Control language: crisp corners, border-led, flat.
 * No colored shadows, no glow — depth belongs to overlays only.
 * Focus is a real outline (set globally in index.css) so it survives
 * forced-colors mode.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 select-none",
  {
    variants: {
      variant: {
        default:
          "rounded-md bg-primary text-primary-foreground hover:bg-primary/90",
        primary:
          "rounded-md bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "rounded-md border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "rounded-md border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost:
          "rounded-md text-foreground hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        subtle:
          "rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 px-2.5 text-xs",
        lg: "h-10 px-5",
        icon: "h-9 w-9 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
