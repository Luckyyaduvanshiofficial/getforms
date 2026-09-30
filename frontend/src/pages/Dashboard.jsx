// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { ArrowRight, Inbox, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import StatsCard from "@/components/StatsCard"
import FormCard from "@/components/FormCard"
import { formsApi, submissionsApi } from "@/lib/api"
import { formatNumber, timeAgo, truncate } from "@/lib/utils"

/*
 * Composition: one register, read top to bottom.
 *
 * The old dashboard was four identical floating stat cards over a card grid —
 * the median SaaS composition, and one where nothing was prioritised because
 * everything had the same weight. This reads as a ledger instead: a ruled
 * figure band, then the inbound record (the actual artifact), then endpoints.
 */

const EMPTY_STEPS = [
  {
    title: "Create an endpoint",
    body: "Each endpoint is a permanent URL your forms post to.",
  },
  {
    title: "Point a form at it",
    body: "Set action=\"…\" on any HTML form, or POST with fetch.",
  },
  {
    title: "Watch the register fill",
    body: "Submissions land here and forward to email, Slack, Discord or a webhook.",
  },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalForms: 0,
    totalSubmissions: 0,
    submissionsToday: 0,
    submissionsThisMonth: 0,
  })
  const [recentForms, setRecentForms] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const [formsResponse, statsResponse] = await Promise.all([
          formsApi.getAll(),
          submissionsApi.getStats(),
        ])

        const formsData = formsResponse.data || []
        setRecentForms(formsData.slice(0, 5))

        const s = statsResponse.data || {}
        setStats({
          totalForms: s.totalForms ?? formsData.length,
          totalSubmissions: s.totalSubmissions ?? 0,
          submissionsToday: s.submissionsToday ?? 0,
          submissionsThisMonth: s.submissionsThisMonth ?? 0,
        })

        const activity = (s.recentActivity || []).map((item) => ({
          ...item,
          preview:
            Object.values(item.data || {}).find(
              (v) => typeof v === "string" && v.trim().length > 2
            ) || null,
        }))
        setRecentActivity(activity)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Failed to load the register:", error)
        }
        setStats({
          totalForms: 0,
          totalSubmissions: 0,
          submissionsToday: 0,
          submissionsThisMonth: 0,
        })
        setRecentForms([])
        setRecentActivity([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Inbound register
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every submission recorded against your endpoints.
          </p>
        </div>
        <Button asChild>
          <Link to="/forms/create">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New endpoint
          </Link>
        </Button>
      </header>

      {/* ── Figures: one ruled band, one number leading ─────────────────── */}
      <section aria-labelledby="figures-heading">
        <h2 id="figures-heading" className="sr-only">
          Submission figures
        </h2>
        <div className="ledger-sheet grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-4">
          <StatsCard
            title="Total submissions"
            value={stats.totalSubmissions}
            icon={Inbox}
            emphasis
            loading={loading}
            className="bg-card"
          />
          <StatsCard
            title="Endpoints"
            value={stats.totalForms}
            loading={loading}
            className="bg-card"
          />
          <StatsCard
            title="Today"
            value={stats.submissionsToday}
            description="since midnight"
            loading={loading}
            className="bg-card"
          />
          <StatsCard
            title="This month"
            value={stats.submissionsThisMonth}
            description="calendar month"
            loading={loading}
            className="bg-card"
          />
        </div>
      </section>

      {/* ── The artifact: what actually arrived ─────────────────────────── */}
      <section aria-labelledby="inbound-heading">
        <div className="ledger-sheet">
          <div className="ledger-head">
            <div className="flex items-baseline gap-2">
              <h2 id="inbound-heading" className="font-display text-sm font-semibold">
                Inbound record
              </h2>
              {!loading && recentActivity.length > 0 && (
                <span className="ledger-label">{recentActivity.length} latest</span>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link to="/submissions">
                Open inbox
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <ul className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <li key={i} className="px-3 py-3.5">
                  <div className="h-4 w-1/2 animate-pulse rounded-sm bg-muted" aria-hidden="true" />
                </li>
              ))}
            </ul>
          ) : recentActivity.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentActivity.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/submissions"
                    className="flex items-center gap-4 px-3 py-3 transition-colors hover:bg-accent/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-[13px] font-medium text-primary">
                          {item.form_name || "unknown"}
                        </span>
                        {item.preview && (
                          <span className="truncate text-sm text-muted-foreground">
                            {truncate(item.preview, 80)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {timeAgo(item.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-10 text-center">
              <Inbox className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium">No submissions recorded yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Anything posted to one of your endpoints appears here within a
                second, and forwards to whichever channels you have configured.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Endpoints ───────────────────────────────────────────────────── */}
      <section aria-labelledby="endpoints-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <h2 id="endpoints-heading" className="font-display text-lg font-semibold">
              Endpoints
            </h2>
            {!loading && recentForms.length > 0 && (
              <span className="ledger-label">
                {formatNumber(stats.totalForms)} total
              </span>
            )}
          </div>
          {recentForms.length > 0 && (
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link to="/forms">
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="ledger-sheet divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-3 py-4">
                <div className="h-8 w-2/3 animate-pulse rounded-sm bg-muted" aria-hidden="true" />
              </div>
            ))}
          </div>
        ) : recentForms.length > 0 ? (
          <div className="ledger-sheet overflow-hidden">
            <ul role="list">
              {recentForms.map((form) => (
                <FormCard key={form.id} form={form} />
              ))}
            </ul>
          </div>
        ) : (
          <div className="ledger-sheet p-5">
            <p className="text-sm font-medium">No endpoints yet</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              An endpoint is the address your forms post to. Three steps and
              you are receiving.
            </p>

            {/* A procedure, not three equal feature tiles. */}
            <ol className="mt-5 divide-y divide-border border-y border-border">
              {EMPTY_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3 py-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-border bg-muted font-mono text-[11px] text-muted-foreground">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{step.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {step.body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/forms/create">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create your first endpoint
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/account">Configure delivery</Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
