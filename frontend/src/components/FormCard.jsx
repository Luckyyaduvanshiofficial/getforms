// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useState } from "react"
import { Link } from "react-router-dom"
import { MoreVertical, Trash2, ExternalLink, Copy, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
import { formatDate, formatNumber } from "@/lib/utils"
import { PUBLIC_BASE_URL as API_BASE_URL } from "@/lib/api"

// Deterministic color from tag string
const TAG_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
]
function tagColor(tag) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export default function FormCard({ form, onDelete, showActions = false, onTagClick }) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [copied, setCopied] = useState(false)

  const handleCopyEndpoint = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!form?.endpoint) return
    navigator.clipboard.writeText(`${API_BASE_URL}/f/${form.endpoint}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteOpen(true)
  }

  return (
    <>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete form</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{form.name}</strong>? This will permanently remove the form and all its submissions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onDelete?.()}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Link to={`/forms/${form.id}`} className="block group">
      <Card className="bezel-card bezel-card-hover overflow-hidden border-border/80 h-full flex flex-col justify-between">
        <CardContent className="p-5 flex flex-col flex-1">
          {/* Top row: Icon + Name + Actions */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary group-hover:scale-105 transition-transform">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm font-display truncate group-hover:text-primary transition-colors">
                  {form.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${form.active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    /f/{form.endpoint}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Quick Copy Button */}
              <button
                type="button"
                onClick={handleCopyEndpoint}
                title="Copy submission URL"
                className="h-7 px-2 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-mono border border-border/50 flex items-center gap-1 transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              {showActions && form.can_manage !== false && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyEndpoint}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Endpoint
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={`${API_BASE_URL}/f/${form.endpoint}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Hosted Form
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Description */}
          {form.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {form.description}
            </p>
          ) : (
            <div className="mb-2" />
          )}

          {/* Tags */}
          {form.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4 mt-auto">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer ${tagColor(tag)}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick?.(tag) }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer counts */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40 mt-auto">
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumber(form.submissionCount || 0)} <span className="text-muted-foreground font-normal">submissions</span>
            </span>
            <span className="text-[11px] font-mono">
              {form.createdAt || form.created_at
                ? formatDate(form.createdAt || form.created_at)
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
    </>
  )
}
