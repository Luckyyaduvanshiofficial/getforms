// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useEffect, useRef, useState } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom"
import { authApi } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import Login from "@/pages/Login"
import Setup from "@/pages/Setup"
import Dashboard from "@/pages/Dashboard"
import FormsList from "@/pages/FormsList"
import FormDetails from "@/pages/FormDetails"
import CreateForm from "@/pages/CreateForm"
import Settings from "@/pages/Settings"
import FormSettings from "@/pages/FormSettings"
import Analytics from "@/pages/Analytics"
import Account from "@/pages/Account"
import Submissions from "@/pages/Submissions"
import { Toaster } from "@/components/ui/toaster"
import { UnreadProvider } from "@/contexts/UnreadContext"
import { ThemeProvider } from "@/contexts/ThemeContext"

const ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/forms": "Forms",
  "/forms/create": "New form",
  "/submissions": "Inbox",
  "/analytics": "Analytics",
  "/account": "Account",
  "/settings": "Settings",
  "/login": "Sign in",
  "/setup": "Set up",
}

/*
 * Client-side navigation changes the screen and tells nobody: focus stays put
 * and a screen reader announces nothing at all. We retitle the document and
 * move focus to the new view's heading, which is the sanctioned fix.
 */
function RouteAnnouncer() {
  const location = useLocation()

  useEffect(() => {
    const isFormDetail =
      location.pathname.startsWith("/forms/") && location.pathname !== "/forms/create"
    const base = isFormDetail ? "Form detail" : ROUTE_TITLES[location.pathname]
    document.title = base ? `${base} · GetForms` : "GetForms"

    const heading = document.querySelector("main h1")
    if (heading) {
      heading.setAttribute("tabindex", "-1")
      heading.focus({ preventScroll: true })
    }
  }, [location.pathname])

  return null
}

function DashboardLayout() {
  return (
    <UnreadProvider>
      <div className="min-h-screen bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-sm focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>

        <Sidebar />
        <Header />

        <main
          id="main-content"
          className="pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0 md:ps-[72px]"
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </UnreadProvider>
  )
}

// Checks setup-status and redirects to /setup if no users exist yet
const SETUP_RETRY_DELAYS = [1000, 2000, 4000]

function SetupGuard({ children }) {
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const timers = useRef([])

  useEffect(() => {
    let cancelled = false

    async function check(attempt = 0) {
      try {
        const { data } = await authApi.setupStatus()
        if (cancelled) return
        if (data.needsSetup && location.pathname !== "/setup") {
          navigate("/setup", { replace: true })
        } else if (!data.needsSetup && location.pathname === "/setup") {
          navigate("/login", { replace: true })
        }
        setChecking(false)
      } catch {
        if (cancelled) return
        if (attempt < SETUP_RETRY_DELAYS.length) {
          const id = setTimeout(() => check(attempt + 1), SETUP_RETRY_DELAYS[attempt])
          timers.current.push(id)
        } else {
          setError(true)
          setChecking(false)
        }
      }
    }

    check()
    return () => {
      cancelled = true
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [location.pathname, navigate])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span role="status" className="sr-only">Loading</span>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="ledger-sheet w-full max-w-sm space-y-3 p-6 text-center">
          <h1 className="font-display text-base font-semibold">Cannot reach the server</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            GetForms could not complete its startup check. Confirm the backend is
            running, then reload this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-sm border border-input bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  return children
}

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span role="status" className="sr-only">Loading</span>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
      </div>
    )
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login"} replace />
  }

  return <DashboardLayout />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span role="status" className="sr-only">Loading</span>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" replace /> : children
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <RouteAnnouncer />
        <Toaster />
      <SetupGuard>
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/forms" element={<FormsList />} />
            <Route path="/forms/create" element={<CreateForm />} />
            <Route path="/forms/:id" element={<FormDetails />} />
            <Route path="/forms/:id/settings" element={<FormSettings />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/account" element={<Account />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SetupGuard>
    </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
