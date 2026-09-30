// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Plus,
  BarChart3,
  Inbox,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useUnread } from "@/contexts/UnreadContext"
import ThemeToggle from "@/components/ThemeToggle"

/*
 * Navigation is an instrument rail, not a 256px sidebar.
 * The data reclaims the width the old chrome was spending.
 *
 * Desktop: a fixed left rail with stacked icon + label.
 * Mobile:  a fixed bottom bar, so primary navigation sits in the thumb zone
 *          instead of behind a hamburger.
 */

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/forms", icon: FileText, label: "Forms" },
  { to: "/submissions", icon: Inbox, label: "Inbox", showUnread: true },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/account", icon: Settings2, label: "Account" },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { unreadCount } = useUnread()

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?"

  const railItem = ({ isActive }) =>
    cn(
      "group relative flex w-full flex-col items-center justify-center gap-1 rounded-sm px-1 py-2.5 text-[10px] font-medium leading-none transition-colors",
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
    )

  const barItem = ({ isActive }) =>
    cn(
      "relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium leading-none transition-colors",
      isActive ? "text-primary" : "text-muted-foreground"
    )

  return (
    <>
      {/* ── Desktop: left instrument rail ───────────────────────────────── */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 start-0 z-30 hidden w-[72px] flex-col border-e border-border bg-card md:flex"
      >
        <NavLink
          to="/dashboard"
          className="flex h-14 items-center justify-center border-b border-border"
          aria-label="GetForms, go to dashboard"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/40 bg-primary/10 text-primary">
            <svg
              className="h-4 w-4"
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
        </NavLink>

        <div className="flex flex-1 flex-col items-stretch gap-0.5 p-1.5">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={railItem} title={item.label}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1.5 start-0 w-[2px] rounded-full bg-primary"
                    />
                  )}
                  <span className="relative">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.showUnread && unreadCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -end-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-semibold text-primary-foreground"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="text-center">
                    {item.label}
                    {item.showUnread && unreadCount > 0 && (
                      <span className="sr-only">, {unreadCount} unread</span>
                    )}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          <NavLink
            to="/forms/create"
            title="New form"
            className="mt-2 flex flex-col items-center justify-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-1 py-2.5 text-[10px] font-medium leading-none text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New</span>
          </NavLink>
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-border p-1.5">
          <ThemeToggle iconOnly className="w-full" />
          <NavLink
            to="/account"
            className="flex w-full flex-col items-center gap-1 rounded-sm px-1 py-2 text-[10px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            title={user?.name ? `${user.name}, account` : "Account"}
          >
            <Avatar className="h-6 w-6 rounded-sm border border-border">
              <AvatarFallback className="rounded-sm bg-muted font-mono text-[10px] text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-full truncate">Account</span>
          </NavLink>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Sign out"
            onClick={() => { logout(); navigate("/login") }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </nav>

      {/* ── Mobile: bottom bar in the thumb zone ────────────────────────── */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={barItem}>
            {({ isActive }) => (
              <>
                <span className="relative">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.showUnread && unreadCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -end-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-semibold text-primary-foreground"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span>
                  {item.label}
                  {item.showUnread && unreadCount > 0 && (
                    <span className="sr-only">, {unreadCount} unread</span>
                  )}
                  {isActive && <span className="sr-only"> (current)</span>}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
