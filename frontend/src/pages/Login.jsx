// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

/*
 * Composition: a docket, not a centred card on a glow.
 *
 * The old sign-in was one centred panel floating over a 140px indigo blur,
 * with a rounded-2xl icon above the wordmark. A screen with exactly one job
 * reads better as a split: what this instance is on one side, the single
 * action on the other.
 */

const FACTS = [
  ["Endpoints", "Unlimited"],
  ["Submissions", "Unlimited"],
  ["Database", "SQLite or Postgres"],
  ["Delivery", "Email, Slack, Discord, Telegram, Webhooks"],
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(username, password)
      const next = searchParams.get("next")
      navigate(
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
        { replace: true }
      )
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Those credentials did not match an account on this instance."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="grid w-full max-w-3xl overflow-hidden md:grid-cols-[1fr_1fr]">
        {/* Left: what this instance is */}
        <div className="border border-border bg-muted p-6 md:border-e-0 md:p-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-primary/40 bg-primary/10 text-primary">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight" translate="no">
              GetForms
            </span>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            A self-hosted form backend. Point an HTML form at an endpoint and
            every submission is recorded here and forwarded where you choose.
          </p>

          <dl className="mt-6 divide-y divide-border border-y border-border">
            {FACTS.map(([term, value]) => (
              <div key={term} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="ledger-label">{term}</dt>
                <dd className="text-end text-xs text-muted-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Right: the single action */}
        <div className="border border-t-0 border-border bg-card p-6 md:border-s-0 md:border-t md:p-8">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the administrator account for this instance.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium">
                Username or email
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                spellCheck="false"
                className="w-full rounded-sm border border-input bg-background px-2.5 py-2 text-base sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-sm border border-input bg-background px-2.5 py-2 text-base sm:text-sm"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-sm border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs leading-relaxed text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Signing in" : "Sign in"}
            </button>
          </form>

          {import.meta.env.DEV && (
            <p className="mt-5 border-t border-border pt-4 text-[11px] text-muted-foreground">
              Development default:{" "}
              <span className="font-mono text-foreground">admin</span> /{" "}
              <span className="font-mono text-foreground">admin123</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
