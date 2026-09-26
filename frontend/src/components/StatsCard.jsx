// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { Card, CardContent } from "@/components/ui/card"
import { formatNumber } from "@/lib/utils"

export default function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "primary",
  loading = false,
}) {
  const accentStyles = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  }

  const badgeStyle = accentStyles[accent] || accentStyles.primary

  return (
    <Card className="bezel-card bezel-card-hover group overflow-hidden border-border/80">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          {Icon && (
            <div className={`p-2 rounded-lg border transition-transform duration-200 group-hover:scale-110 ${badgeStyle}`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded-md mt-3" />
        ) : (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight tabular-nums font-display">
              {formatNumber(value)}
            </span>
            {description && (
              <span className="text-xs text-muted-foreground font-medium">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
