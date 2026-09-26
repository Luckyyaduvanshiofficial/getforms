// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { BarChart3, FileText, Inbox, Plus, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import StatsCard from "@/components/StatsCard"
import FormCard from "@/components/FormCard"
import { formsApi, submissionsApi } from "@/lib/api"
import { timeAgo, truncate } from "@/lib/utils"

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
        // Fetch forms and stats in parallel from backend (service_role — correct data)
        const [formsResponse, statsResponse] = await Promise.all([
          formsApi.getAll(),
          submissionsApi.getStats(),
        ])

        const formsData = formsResponse.data || []
        setRecentForms(formsData.slice(0, 4))

        const stats = statsResponse.data || {}
        setStats({
          totalForms: stats.totalForms ?? formsData.length,
          totalSubmissions: stats.totalSubmissions ?? 0,
          submissionsToday: stats.submissionsToday ?? 0,
          submissionsThisMonth: stats.submissionsThisMonth ?? 0,
        })
        // Add a text preview from submission data for each activity item
        const activity = (stats.recentActivity || []).map(item => ({
          ...item,
          preview: Object.values(item.data || {}).find(v => typeof v === 'string' && v.trim().length > 2) || null
        }))
        setRecentActivity(activity)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        setStats({
          totalForms: 0,
          totalSubmissions: 0,
          submissionsToday: 0,
          submissionsThisMonth: 0,
        })
        setRecentForms([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
              Welcome back, {user?.name?.split(' ')[0] || "Admin"}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Overview of form submissions and endpoint delivery performance.
          </p>
        </div>
        <Button asChild size="default" className="shadow-sm shadow-primary/20">
          <Link to="/forms/create" className="gap-2">
            <Plus className="h-4 w-4" />
            New Form
          </Link>
        </Button>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Forms"
          value={stats.totalForms}
          icon={FileText}
          accent="primary"
          loading={loading}
        />
        <StatsCard
          title="Total Submissions"
          value={stats.totalSubmissions}
          icon={Inbox}
          accent="emerald"
          loading={loading}
        />
        <StatsCard
          title="Today"
          value={stats.submissionsToday}
          description="new leads"
          icon={BarChart3}
          accent="sky"
          loading={loading}
        />
        <StatsCard
          title="This Month"
          value={stats.submissionsThisMonth}
          description="total volume"
          icon={BarChart3}
          accent="amber"
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      {recentForms.length > 0 && (
        <div className="bezel-card p-5 border-border/80">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
            <div>
              <h2 className="text-base font-bold font-display tracking-tight">Live Inbound Feed</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time incoming submissions across all forms</p>
            </div>
            {recentActivity.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                <Link to="/submissions">
                  View all submissions
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/60 animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="divide-y divide-border/40">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3.5 py-3 hover:bg-muted/40 px-2 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="text-foreground font-semibold">{item.form_name}</span>
                      {item.preview && <span className="text-muted-foreground font-normal"> — {truncate(item.preview, 70)}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">{timeAgo(item.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4 border border-dashed border-border/60 rounded-lg bg-muted/20">
              <Inbox className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Awaiting incoming submissions</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Submissions sent to any of your active endpoints will immediately appear here in real time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Forms / Quickstart Guide */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-display">
            {recentForms.length > 0 ? "Your Forms" : "Getting Started"}
          </h2>
          {recentForms.length > 0 && (
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link to="/forms">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : recentForms.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {recentForms.map((form) => (
              <FormCard key={form.id} form={form} />
            ))}
          </div>
        ) : (
          <div className="bezel-card p-6 sm:p-8 border-border/80 bg-gradient-to-b from-card to-muted/20">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
                Zero Configuration Required
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight font-display mb-2">
                Your Self-Hosted Form Engine is Ready
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Connect any contact form, newsletter signup, or registration modal from your website without writing backend code.
              </p>

              <div className="grid gap-3 sm:grid-cols-3 mb-6">
                <div className="p-4 rounded-lg border border-border/60 bg-background/50">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center mb-2">
                    1
                  </div>
                  <h4 className="text-xs font-semibold mb-1">Create Endpoint</h4>
                  <p className="text-[11px] text-muted-foreground">Generate a unique endpoint URL for your project.</p>
                </div>
                <div className="p-4 rounded-lg border border-border/60 bg-background/50">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center mb-2">
                    2
                  </div>
                  <h4 className="text-xs font-semibold mb-1">Embed in HTML</h4>
                  <p className="text-[11px] text-muted-foreground">Set <code className="text-primary font-mono">&lt;form action=&quot;...&quot;&gt;</code> or submit via JS fetch.</p>
                </div>
                <div className="p-4 rounded-lg border border-border/60 bg-background/50">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center mb-2">
                    3
                  </div>
                  <h4 className="text-xs font-semibold mb-1">Receive Leads</h4>
                  <p className="text-[11px] text-muted-foreground">Stream submissions directly to email, Telegram, Discord, or Slack.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="default" className="shadow-sm shadow-primary/20">
                  <Link to="/forms/create" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Form
                  </Link>
                </Button>
                <Button variant="outline" size="default" asChild>
                  <Link to="/account">
                    Configure Email (SMTP)
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
