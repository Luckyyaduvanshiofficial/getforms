// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * Field boundaries are square and explicit: a record is written on a ruled line.
 * text-base on small screens kills iOS Safari's focus zoom; sm:text-sm restores
 * the intended desktop size. Never use maximum-scale to suppress it.
 */
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-sm border border-input bg-card px-2.5 py-1 text-base text-foreground transition-colors",
        "sm:text-sm",
        "placeholder:text-muted-foreground/70",
        "hover:border-muted-foreground/40",
        "focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "aria-[invalid=true]:border-destructive",
        "file:border-0 file:bg-transparent file:font-medium file:text-foreground",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
