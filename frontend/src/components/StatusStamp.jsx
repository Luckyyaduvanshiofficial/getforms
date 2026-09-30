// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Lucky Yaduvanshi/getforms

import { Check, CircleDot, Loader, Archive, Pause, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * One status voice for the whole product.
 *
 * Two failures this replaces:
 *  1. Status was carried by a coloured dot alone. Meaning that only exists in
 *     hue is invisible to roughly 1 in 12 men, and to anyone in bright light.
 *  2. Every surface (inbox, form card, form detail) drew its own dot with its
 *     own palette, so the same state looked different in three places.
 *
 * Every stamp carries a label AND a distinct glyph, so the state survives
 * grayscale, colour-blindness, and forced-colours mode.
 */

// Static class strings: Tailwind's scanner has to see the literal, so these
// are never built by concatenation.
const TONES = {
  new: "text-status-new border-status-new/40 bg-status-new/10",
  in_progress: "text-status-progress border-status-progress/40 bg-status-progress/10",
  resolved: "text-status-resolved border-status-resolved/40 bg-status-resolved/10",
  failed: "text-status-failed border-status-failed/40 bg-status-failed/10",
  active: "text-status-resolved border-status-resolved/40 bg-status-resolved/10",
  paused: "text-status-progress border-status-progress/40 bg-status-progress/10",
  archived: "text-muted-foreground border-border bg-muted",
}

const GLYPHS = {
  new: CircleDot,
  in_progress: Loader,
  resolved: Check,
  failed: AlertTriangle,
  active: Check,
  paused: Pause,
  archived: Archive,
}

const LABELS = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  failed: "Failed",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
}

export default function StatusStamp({ status = "new", className, hideLabel = false }) {
  const key = TONES[status] ? status : "new"
  const Glyph = GLYPHS[key]
  const label = LABELS[key]

  return (
    <span
      className={cn(
        "stamp border",
        TONES[key],
        hideLabel && "px-1",
        className
      )}
    >
      <Glyph className="h-3 w-3 shrink-0" aria-hidden="true" />
      {hideLabel ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </span>
  )
}

export { TONES as statusTones, LABELS as statusLabels }
