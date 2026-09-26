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
  UserCircle,
  ChevronRight,
  Inbox,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useUnread } from "@/contexts/UnreadContext"
import ThemeToggle from "@/components/ThemeToggle"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/forms", icon: FileText, label: "Forms" },
  { to: "/submissions", icon: Inbox, label: "Submissions", showUnread: true },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/account", icon: UserCircle, label: "Settings" },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { unreadCount } = useUnread()

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-background/95 backdrop-blur-md border-r border-border/70 z-30">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border/40">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight font-display">
                GetForms
              </span>
              <span className="font-mono text-[10px] font-medium text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/40">
                v2.0
              </span>
            </div>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20 dark:bg-primary/15 dark:border-primary/25"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent"
                  )
                }
              >
                <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="flex-1">{item.label}</span>
                {item.showUnread && unreadCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 shadow-xs">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Button-in-Button "New Form" CTA */}
          <div className="pt-4 px-1">
            <NavLink
              to="/forms/create"
              className="group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm shadow-primary/25 transition-all duration-200 active:scale-[0.98]"
            >
              <span>New Form</span>
              <div className="w-5 h-5 rounded-md bg-white/20 dark:bg-black/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-200">
                <Plus className="h-3.5 w-3.5" />
              </div>
            </NavLink>
          </div>
        </nav>

        {/* Bottom Profile & Utilities */}
        <div className="p-3 border-t border-border/50 bg-muted/20">
          <NavLink
            to="/account"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer group mb-1"
          >
            <div className="relative">
              <Avatar className="h-8 w-8 rounded-lg border border-border/80">
                <AvatarFallback className="text-xs font-semibold rounded-lg bg-muted text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-tight">{user?.name || "Admin"}</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{user?.email || "admin@getform.local"}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
          </NavLink>

          <div className="flex items-center gap-1.5 pt-1">
            <ThemeToggle className="flex-1 justify-start h-8 text-xs text-muted-foreground hover:text-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => { logout(); navigate('/login') }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
