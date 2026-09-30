// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useState } from "react"
import { Link } from "react-router-dom"
import { Copy, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import StatusStamp from "@/components/StatusStamp"
import { formatNumber, timeAgo } from "@/lib/utils"
import { PUBLIC_BASE_URL as API_BASE_URL } from "@/lib/api"

/*
 * An endpoint row in the register.
 *
 * Previously a floating card in a grid: every endpoint given equal area
 * regardless of importance, a rounded-2xl shell around three lines of text,
 * a pulsing status dot with no label, and a clickable tag <span> that the
 * keyboard could never reach.
 *
 * Rows read faster and align into columns. The navigation link and the row
 * actions are siblings rather than nested, because a button inside an anchor
 * is invalid and breaks the keyboard path.
 *
 * Renders an <li>; the parent supplies the <ul> and the ruled container.
 */
export default function FormCard({ form, onDelete, showActions = false }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyEndpoint = () => {
    if (!form?.endpoint) return
    navigator.clipboard?.writeText(`${API_BASE_URL}/f/${form.endpoint}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isActive = form.active !== false
  const count = form.submissionCount ?? form.submission_count ?? 0
  const created = form.createdAt || form.created_at

  return (
    <li className="group relative flex items-start gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-b-0 hover:bg-accent/40 focus-within:bg-accent/40">
      <Link
        to={`/forms/${form.id}`}
        className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[13px] font-medium text-primary">
            /f/{form.endpoint}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span className="truncate text-sm text-foreground">{form.name}</span>
            {form.tags?.length > 0 && (
              <span className="flex shrink-0 items-center gap-1">
                {form.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            )}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-4">
          <StatusStamp status={isActive ? "active" : "paused"} />
          <span className="w-16 text-end font-mono text-xs tabular-nums text-muted-foreground">
            {formatNumber(count)}
            <span className="sr-only"> submissions</span>
          </span>
          <span className="hidden w-20 text-end text-xs text-muted-foreground md:inline">
            {created ? timeAgo(created) : "—"}
          </span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center">
        {showActions && form.can_manage !== false && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                aria-label={`Actions for ${form.name}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleCopyEndpoint}>
                <Copy className="me-2 h-4 w-4" aria-hidden="true" />
                {copied ? "Endpoint copied" : "Copy endpoint"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`${API_BASE_URL}/f/${form.endpoint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="me-2 h-4 w-4" aria-hidden="true" />
                  Open hosted form
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                Delete endpoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{form.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the endpoint and every submission recorded
              against it ({formatNumber(count)} so far). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep endpoint</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete?.()}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
