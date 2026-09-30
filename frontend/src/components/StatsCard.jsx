// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { formatNumber, cn } from "@/lib/utils"

/*
 * A figure cell, not a monument.
 *
 * The old version was four identical floating cards, each shouting the same
 * volume with an icon topper. A ledger states its figures once, in a ruled
 * band, with one number given precedence over the rest.
 *
 * This renders the CELL ONLY — the parent supplies the rules and corners, so
 * a row of these reads as one register rather than four detached boxes.
 */
export default function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  emphasis = false,
  loading = false,
  className,
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 px-4 py-3.5", className)}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
        <span className="ledger-label">{title}</span>
      </div>

      {loading ? (
        <div
          className="h-7 w-20 animate-pulse rounded-sm bg-muted"
          aria-hidden="true"
        />
      ) : (
        <span
          className={cn(
            "font-display font-semibold leading-none tabular-nums",
            emphasis ? "text-3xl" : "text-2xl"
          )}
        >
          {formatNumber(value)}
        </span>
      )}

      {description && (
        <span className="text-[11px] leading-tight text-muted-foreground">
          {description}
        </span>
      )}
    </div>
  )
}
