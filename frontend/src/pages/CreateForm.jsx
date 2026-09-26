// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { isValidUrl, isValidEmail } from "@/lib/utils"
import { formsApi } from "@/lib/api"

const generateEndpoint = (name) => {
  const slug =
    name
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "form"

  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let suffix = ""

  if (window.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(8)
    window.crypto.getRandomValues(randomValues)
    suffix = Array.from(randomValues)
      .map((v) => chars[v % chars.length])
      .join("")
  } else {
    for (let i = 0; i < 8; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }

  return `${slug}-${suffix}`
}

export default function CreateForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    redirectUrl: "",
    notificationEmail: "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    // Strip dangerous patterns without trimming — trim happens on submit
    const sanitized = typeof value === 'string'
      ? value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '')
      : value
    setFormData((prev) => ({ ...prev, [name]: sanitized }))
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form name
    if (!formData.name.trim()) {
      setError("Form name is required")
      return
    }
    
    // Validate URL if provided
    if (formData.redirectUrl && !isValidUrl(formData.redirectUrl)) {
      setError('Please enter a valid URL starting with http:// or https://')
      return
    }
    
    // Validate email if provided
    if (formData.notificationEmail && !isValidEmail(formData.notificationEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      // Create form using API
      const endpoint = generateEndpoint(formData.name)

      const response = await formsApi.create({
        name: formData.name,
        description: formData.description || null,
        endpoint,
        redirect_url: formData.redirectUrl || null,
        notification_email: formData.notificationEmail || null,
      })

      const newForm = response.data
      if (!newForm) {
        throw new Error("Failed to create form")
      }

      navigate(`/forms/${newForm.id}`)
    } catch (err) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.error("Failed to create form:", err)
      }
      setError(err.response?.data?.message || err.message || "Failed to create form")
    } finally {
      setLoading(false)
    }
  }

  const previewEndpoint = formData.name ? generateEndpoint(formData.name) : "your-form-slug"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-xl h-9 w-9">
          <Link to="/forms">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Create New Form</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Configure your endpoint slug and notification preferences
          </p>
        </div>
      </div>

      <Card className="bezel-card border-border/80 shadow-md">
        <CardHeader className="pb-4 border-b border-border/40">
          <CardTitle className="text-base font-bold font-display">General Configuration</CardTitle>
          <CardDescription className="text-xs">
            Enter the basic details for your form endpoint
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Form Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Website Contact Form"
                value={formData.name}
                onChange={handleChange}
                className="bg-background border-border/80 text-sm h-10 rounded-xl"
              />
              {formData.name && (
                <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10">POST</span>
                  <span className="truncate">/f/{previewEndpoint}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (Optional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="Used for inquiries, demo requests, and newsletter signups"
                value={formData.description}
                onChange={handleChange}
                className="bg-background border-border/80 text-sm h-10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirectUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Success Redirect URL (Optional)</Label>
              <Input
                id="redirectUrl"
                name="redirectUrl"
                type="url"
                placeholder="https://yoursite.com/thank-you"
                value={formData.redirectUrl}
                onChange={handleChange}
                className="bg-background border-border/80 text-sm h-10 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                If provided, regular browser form submissions will redirect here after completion.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notificationEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notification Email (Optional)</Label>
              <Input
                id="notificationEmail"
                name="notificationEmail"
                type="email"
                placeholder="alerts@yourdomain.com"
                value={formData.notificationEmail}
                onChange={handleChange}
                className="bg-background border-border/80 text-sm h-10 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Instant submission notifications will be dispatched here. SMTP server settings can be configured under Settings → Notifications.
              </p>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="shadow-sm shadow-primary/25 min-w-[130px]"
              >
                {loading ? "Creating..." : "Create Form"}
              </Button>
              <Button type="button" variant="outline" asChild className="rounded-lg">
                <Link to="/forms">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
