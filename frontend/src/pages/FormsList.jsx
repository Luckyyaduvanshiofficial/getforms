// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Link } from "react-router-dom"
import { Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FormCard from "@/components/FormCard"
import { formsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { formatNumber } from "@/lib/utils"

/*
 * Compare surface: endpoints read as a register, not a card grid.
 * A grid gives every endpoint identical area and breaks column alignment,
 * which is exactly what you need when scanning for the one that is failing.
 */
export default function FormsList() {
  const { user } = useAuth()
  const [forms, setForms] = useState([])
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchForms() {
      try {
        if (!user) {
          setLoading(false)
          return
        }
        const response = await formsApi.getAll()
        const formsData = response.data || []
        setForms(formsData)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Failed to load endpoints:", error)
        }
        setForms([])
      } finally {
        setLoading(false)
      }
    }
    fetchForms()
  }, [user])

  const allTags = useMemo(() => {
    const set = new Set()
    forms.forEach((f) => f.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [forms])

  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase()
    return forms.filter((form) => {
      if (tagFilter && !form.tags?.includes(tagFilter)) return false
      if (!q) return true
      return (
        form.name?.toLowerCase().includes(q) ||
        form.endpoint?.toLowerCase().includes(q)
      )
    })
  }, [forms, search, tagFilter])

  const isFiltering = Boolean(search.trim() || tagFilter)

  const handleDelete = async (id) => {
    try {
      await formsApi.delete(id)
      setForms((prev) => prev.filter((form) => form.id !== id))
      toast({ title: "Endpoint deleted" })
    } catch (error) {
      toast({
        title: "Could not delete endpoint",
        description:
          error.response?.data?.message ||
          "The server rejected the request. Try again in a moment.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Endpoints
            </h1>
            {!loading && (
              <span className="ledger-label">
                {formatNumber(forms.length)} total
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Each endpoint is a permanent URL that accepts form submissions.
          </p>
        </div>
        <Button asChild>
          <Link to="/forms/create">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New endpoint
          </Link>
        </Button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <label htmlFor="endpoint-filter" className="sr-only">
            Filter endpoints by name or URL
          </label>
          <Search
            className="pointer-events-none absolute inset-y-0 start-2.5 my-auto h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="endpoint-filter"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or /f/slug"
            className="ps-8 pe-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute inset-y-0 end-1.5 my-auto flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="tag-filter" className="ledger-label">
              Tag
            </label>
            <select
              id="tag-filter"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="h-9 rounded-sm border border-input bg-card px-2 text-sm text-foreground"
            >
              <option value="">All</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFiltering && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setTagFilter("")
            }}
            className="text-muted-foreground"
          >
            Reset filters
          </Button>
        )}
      </div>

      <p role="status" className="sr-only">
        {loading
          ? "Loading endpoints"
          : `${filteredForms.length} of ${forms.length} endpoints shown`}
      </p>

      {/* Register */}
      {loading ? (
        <div className="ledger-sheet divide-y divide-border">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-3 py-4">
              <div className="h-8 w-2/3 animate-pulse rounded-sm bg-muted" aria-hidden="true" />
            </div>
          ))}
        </div>
      ) : filteredForms.length > 0 ? (
        <div className="ledger-sheet overflow-hidden">
          <ul role="list">
            {filteredForms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onDelete={() => handleDelete(form.id)}
                showActions
              />
            ))}
          </ul>
        </div>
      ) : (
        <div className="ledger-sheet px-5 py-12 text-center">
          <p className="text-sm font-medium">
            {isFiltering ? "No endpoints match those filters" : "No endpoints yet"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {isFiltering
              ? "Try a shorter search term, or reset the filters to see everything."
              : "Create an endpoint, point a form at it, and submissions will start landing in your inbox."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {isFiltering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("")
                  setTagFilter("")
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/forms/create">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create your first endpoint
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
