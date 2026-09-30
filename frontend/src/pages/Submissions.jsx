// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useEffect, useState, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import {
  Archive,
  Paperclip,
  Download,
  ChevronDown,
  ExternalLink,
  Reply,
  Send,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import StatusStamp from "@/components/StatusStamp"
import { submissionsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { formatDate, truncate, isValidUrl, formatNumber } from "@/lib/utils"
import { useUnread } from "@/contexts/UnreadContext"

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
]

function SubmissionRow({ submission, onArchive, onStatusChange, onRead }) {
  const [expanded, setExpanded] = useState(false)
  const [isRead, setIsRead] = useState(!!submission.read_at)
  const [status, setStatus] = useState(submission.status || "new")
  const [notes, setNotes] = useState(submission.notes || "")
  const [savingNotes, setSavingNotes] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [replySubject, setReplySubject] = useState("")
  const [replyMessage, setReplyMessage] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const notesTimer = useRef(null)

  const panelId = `submission-panel-${submission.id}`
  const notesId = `submission-notes-${submission.id}`
  const replySubjectId = `submission-reply-subject-${submission.id}`
  const replyMessageId = `submission-reply-message-${submission.id}`

  const fields = Object.entries(submission.data || {})
  const fileUrls = submission.file_urls || []
  const hasEmail = fields.some(([k]) => k.toLowerCase().includes("email"))

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !isRead) {
      setIsRead(true)
      submissionsApi.markRead(submission.id).catch(() => {})
      onRead?.(submission.id)
    }
  }

  const handleStatusChange = async (newStatus) => {
    const prev = status
    setStatus(newStatus)
    try {
      await submissionsApi.updateStatus(submission.id, newStatus)
      onStatusChange(submission.id, newStatus)
    } catch {
      setStatus(prev)
      toast({
        title: "Status not saved",
        description: "The server rejected the change. Try again in a moment.",
        variant: "destructive",
      })
    }
  }

  const handleSendReply = async () => {
    if (!replySubject.trim() || !replyMessage.trim()) return
    setSendingReply(true)
    try {
      await submissionsApi.reply(submission.id, {
        subject: replySubject,
        message: replyMessage,
      })
      toast({ title: "Reply sent" })
      setShowReply(false)
      setReplySubject("")
      setReplyMessage("")
    } catch (err) {
      toast({
        title: "Reply not sent",
        description:
          err?.response?.data?.error ||
          "The mail server rejected the message. Check your SMTP settings.",
        variant: "destructive",
      })
    } finally {
      setSendingReply(false)
    }
  }

  const handleNotesChange = (value) => {
    setNotes(value)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      setSavingNotes(true)
      try {
        await submissionsApi.updateNotes(submission.id, value)
      } catch {
        toast({
          title: "Note not saved",
          description: "The server rejected the note. Try again in a moment.",
          variant: "destructive",
        })
      } finally {
        setSavingNotes(false)
      }
    }, 800)
  }

  useEffect(() => {
    return () => {
      if (notesTimer.current) clearTimeout(notesTimer.current)
    }
  }, [])

  return (
    <li
      className={`border-b border-border last:border-b-0 ${
        isRead ? "" : "bg-primary/[0.035]"
      }`}
    >
      {/*
        The row header is a real <button>. It used to be a <div onClick>, so the
        mouse could expand a submission and the keyboard could not reach it at all.
      */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-3 py-3 text-start transition-colors hover:bg-accent/40"
      >
        <span className="sr-only">{isRead ? "Read." : "Unread."}</span>
        <span className="flex w-2 shrink-0 justify-center" aria-hidden="true">
          {!isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </span>

        <span className="shrink-0 rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {submission.form_name || "unknown"}
        </span>

        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            isRead ? "text-muted-foreground" : "font-medium text-foreground"
          }`}
        >
          {fields.length > 0
            ? truncate(
                fields
                  .slice(0, 2)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("  ·  "),
                80
              )
            : "No field data"}
        </span>

        {fileUrls.length > 0 && (
          <span className="hidden shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground sm:flex">
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            {fileUrls.length}
            <span className="sr-only"> attachments</span>
          </span>
        )}

        <StatusStamp status={status} className="hidden sm:inline-flex" />

        <span className="hidden shrink-0 font-mono text-xs text-muted-foreground md:inline">
          {formatDate(submission.created_at)}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id={panelId} className="space-y-4 border-t border-border px-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ledger-label">Status</span>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Submission status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onArchive(submission.id)}
            >
              <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              Archive
            </Button>

            {hasEmail && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowReply((v) => !v)}
                aria-expanded={showReply}
              >
                <Reply className="h-3.5 w-3.5" aria-hidden="true" />
                Reply
              </Button>
            )}

            <Link
              to={`/forms/${submission.form_id}`}
              className="ms-auto flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Open endpoint
            </Link>
          </div>

          <dl className="divide-y divide-border border-y border-border">
            {fields.map(([key, value]) => (
              <div key={key} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="font-mono text-xs text-muted-foreground">{key}</dt>
                <dd className="break-anywhere text-sm">
                  {typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>

          {fileUrls.length > 0 && (
            <div className="space-y-1.5">
              <span className="ledger-label">Attachments</span>
              <ul className="space-y-1.5">
                {fileUrls.map((file, i) => {
                  const href = file.url || file
                  const name = file.name || `File ${i + 1}`
                  return (
                    <li key={i}>
                      {isValidUrl(href) ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{name}</span>
                          {file.size && (
                            <span className="ms-auto font-mono text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </a>
                      ) : (
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{name}</span>
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr] sm:gap-x-4">
            <dt className="font-mono text-xs text-muted-foreground">IP address</dt>
            <dd>{submission.metadata?.ip || "not recorded"}</dd>
            <dt className="font-mono text-xs text-muted-foreground">Received</dt>
            <dd>{formatDate(submission.created_at)}</dd>
            {submission.metadata?.referer && isValidUrl(submission.metadata.referer) && (
              <>
                <dt className="font-mono text-xs text-muted-foreground">Source</dt>
                <dd className="break-anywhere">
                  <a
                    href={submission.metadata.referer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {submission.metadata.referer}
                  </a>
                </dd>
              </>
            )}
          </dl>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor={notesId} className="ledger-label">
                Internal note
              </label>
              <span role="status" className="text-xs text-muted-foreground">
                {savingNotes ? "Saving…" : ""}
              </span>
            </div>
            <textarea
              id={notesId}
              rows={3}
              className="w-full resize-y rounded-sm border border-input bg-card px-2.5 py-2 text-base placeholder:text-muted-foreground/70 sm:text-sm"
              placeholder="Only your team sees this."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
            />
          </div>

          {showReply && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="ledger-label">Reply to submitter</p>
              <label htmlFor={replySubjectId} className="sr-only">
                Reply subject
              </label>
              <Input
                id={replySubjectId}
                placeholder="Subject"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
              />
              <label htmlFor={replyMessageId} className="sr-only">
                Reply message
              </label>
              <textarea
                id={replyMessageId}
                rows={4}
                className="w-full resize-y rounded-sm border border-input bg-card px-2.5 py-2 text-base placeholder:text-muted-foreground/70 sm:text-sm"
                placeholder="Your message"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={sendingReply || !replySubject.trim() || !replyMessage.trim()}
                  onClick={handleSendReply}
                >
                  {sendingReply && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                  {sendingReply ? "Sending" : "Send reply"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReply(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export default function Submissions() {
  const { unreadCount, decrement, reset } = useUnread()
  const [submissions, setSubmissions] = useState([])
  const [forms, setForms] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [formFilter, setFormFilter] = useState("all")
  const [page, setPage] = useState(1)
  const fetchGeneration = useRef(0)

  const fetchSubmissions = useCallback(async () => {
    const generation = ++fetchGeneration.current
    setLoading(true)
    try {
      const params = { page, limit: 50 }
      if (statusFilter !== "all") params.status = statusFilter
      if (formFilter !== "all") params.formId = formFilter

      const response = await submissionsApi.getAll(params)
      if (generation !== fetchGeneration.current) return
      const data = response.data?.submissionsData || response.data || {}
      setSubmissions(data.submissions || [])
      setForms(data.forms || [])
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 })
    } catch {
      if (generation !== fetchGeneration.current) return
      toast({
        title: "Could not load submissions",
        description: "The server did not respond. Check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      if (generation === fetchGeneration.current) setLoading(false)
    }
  }, [page, statusFilter, formFilter])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleFormFilterChange = (value) => {
    setFormFilter(value)
    setPage(1)
  }

  const handleArchive = async (id) => {
    try {
      await submissionsApi.archive(id)
      setSubmissions((prev) => prev.filter((s) => s.id !== id))
      toast({ title: "Submission archived" })
    } catch {
      toast({
        title: "Could not archive",
        description: "The server rejected the request. Try again in a moment.",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = (id, newStatus) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    )
  }

  const handleRead = (id) => {
    decrement(1)
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, read_at: new Date().toISOString() } : s))
    )
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await submissionsApi.markAllRead(formFilter !== "all" ? formFilter : undefined)
      setSubmissions((prev) =>
        prev.map((s) => ({ ...s, read_at: s.read_at || new Date().toISOString() }))
      )
      reset()
      toast({ title: "All submissions marked read" })
    } catch {
      toast({
        title: "Could not mark all read",
        description: "The server rejected the request. Try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setMarkingAll(false)
    }
  }

  const isFiltering = statusFilter !== "all" || formFilter !== "all"

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Inbox</h1>
            {!loading && (
              <span className="ledger-label">
                {formatNumber(pagination.total)} total
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Every submission recorded across your endpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <>
              <span className="stamp border-primary/40 bg-primary/10 text-primary">
                {formatNumber(unreadCount)} unread
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={markingAll}
                onClick={handleMarkAllRead}
              >
                {markingAll ? "Marking" : "Mark all read"}
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter: a pressed-state group, not a fake tab bar. */}
        <div
          role="group"
          aria-label="Filter by status"
          className="flex items-center gap-0.5 rounded-sm border border-border bg-muted p-0.5"
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleStatusFilterChange(f.value)}
                className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {forms.length > 1 && (
          <Select value={formFilter} onValueChange={handleFormFilterChange}>
            <SelectTrigger className="h-9 w-[200px] text-sm" aria-label="Filter by endpoint">
              <SelectValue placeholder="All endpoints" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All endpoints</SelectItem>
              {forms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <p role="status" className="sr-only">
        {loading
          ? "Loading submissions"
          : `${submissions.length} submissions shown of ${pagination.total}`}
      </p>

      {loading ? (
        <div className="ledger-sheet divide-y divide-border">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-3 py-3.5">
              <div className="h-5 w-3/4 animate-pulse rounded-sm bg-muted" aria-hidden="true" />
            </div>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="ledger-sheet px-5 py-14 text-center">
          <p className="text-sm font-medium">
            {isFiltering ? "No submissions match those filters" : "Nothing recorded yet"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {isFiltering
              ? "Reset the filters to see the full register."
              : "Your endpoints are live. Submissions appear here within a second of arriving."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {isFiltering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all")
                  setFormFilter("all")
                  setPage(1)
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/forms">View endpoints</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="ledger-sheet overflow-hidden">
            <ul role="list">
              {submissions.map((submission) => (
                <SubmissionRow
                  key={submission.id}
                  submission={submission}
                  onArchive={handleArchive}
                  onStatusChange={handleStatusChange}
                  onRead={handleRead}
                />
              ))}
            </ul>
          </div>

          {pagination.pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between pt-1">
              <p className="font-mono text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
