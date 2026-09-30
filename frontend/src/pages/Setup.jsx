// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'

export default function Setup() {
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername]           = useState('')
  const [password, setPassword]           = useState('')
  const [confirmPassword, setConfirm]     = useState('')
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { data } = await authApi.setup(username, password)
      loginWithToken(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <span className="font-display text-2xl font-semibold tracking-tight">GetForms</span>
          <p className="mt-1 text-sm text-muted-foreground">
            Create the administrator account for this instance.
          </p>
        </div>

        <div className="ledger-sheet p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="setup-username" className="mb-1.5 block text-xs font-medium">
                Username
              </label>
              <input
                id="setup-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoComplete="username"
                className="w-full rounded-sm border border-input bg-card px-2.5 py-2 text-base sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="setup-password" className="mb-1.5 block text-xs font-medium">
                Password
              </label>
              <input
                id="setup-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-sm border border-input bg-card px-2.5 py-2 text-base sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="setup-confirm" className="mb-1.5 block text-xs font-medium">
                Confirm password
              </label>
              <input
                id="setup-confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat the password"
                required
                autoComplete="new-password"
                className="w-full rounded-sm border border-input bg-card px-2.5 py-2 text-base sm:text-sm"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-sm border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Creating account" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          This account owns every endpoint on the instance.
        </p>
      </div>
    </div>
  )
}
