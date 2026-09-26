// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Link } from "react-router-dom"
import { Plus, Search, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FormCard from "@/components/FormCard"
import { formsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

export default function FormsList() {
  const { user } = useAuth()
  const [forms, setForms] = useState([])
  const [filteredForms, setFilteredForms] = useState([])
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

        // Load forms using API
        const response = await formsApi.getAll()
        const formsData = response.data || []

        // Forms from API should already have submission_count if backend includes it
        // If not, we can fetch it separately or use a default value
        const formsWithCounts = formsData.map((form) => ({
          ...form,
          submissionCount: form.submission_count || form.submissionCount || 0,
        }))

        setForms(formsWithCounts)
        setFilteredForms(formsWithCounts)
      } catch (error) {
        console.error("Failed to fetch forms:", error)
        setForms([])
        setFilteredForms([])
      } finally {
        setLoading(false)
      }
    }
    fetchForms()
  }, [user])

  useEffect(() => {
    let filtered = forms
    if (search) {
      filtered = filtered.filter((form) =>
        form.name.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (tagFilter) {
      filtered = filtered.filter((form) => form.tags?.includes(tagFilter))
    }
    setFilteredForms(filtered)
  }, [search, tagFilter, forms])

  const handleDelete = async (id) => {
    try {
      await formsApi.delete(id)
      const nextForms = forms.filter((form) => form.id !== id)
      setForms(nextForms)
      setFilteredForms(nextForms)
      toast({ title: "Form deleted", description: "The form has been deleted." })
    } catch (error) {
      console.error("Failed to delete form:", error)
      toast({
        title: "Failed to delete",
        description: error.response?.data?.message || "Something went wrong.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">Forms</h1>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">
              {forms.length} total
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your endpoints, access tokens, and webhook notification settings.
          </p>
        </div>
        <Button asChild size="default" className="shadow-sm shadow-primary/20">
          <Link to="/forms/create" className="gap-2">
            <Plus className="h-4 w-4" />
            New Form
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Filter forms by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 bg-card border-border/80 focus:border-primary text-sm h-10 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
        {tagFilter && (
          <button
            onClick={() => setTagFilter("")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-all cursor-pointer"
          >
            <span>Tag: #{tagFilter}</span>
            <span className="text-xs">×</span>
          </button>
        )}
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-xl bg-muted/50 border border-border/40 animate-pulse"
            />
          ))}
        </div>
      ) : filteredForms.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onDelete={() => handleDelete(form.id)}
              showActions
              onTagClick={setTagFilter}
            />
          ))}
        </div>
      ) : (
        <div className="bezel-card text-center py-20 px-4 border-dashed border-border/80 rounded-2xl bg-card/50">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold font-display mb-1.5">
            {search ? "No forms found" : "No forms created yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            {search
              ? `No endpoints matched "${search}". Try adjusting your keywords or clearing filters.`
              : "Create your first form endpoint in 5 seconds and start collecting submissions directly into your inbox."}
          </p>
          {!search && (
            <Button asChild className="shadow-sm shadow-primary/25">
              <Link to="/forms/create" className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first form
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
