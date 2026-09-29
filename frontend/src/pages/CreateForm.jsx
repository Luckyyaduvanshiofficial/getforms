// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  Sparkles,
  Link as LinkIcon,
  Bell,
  Shield,
  FileUp,
  Mail,
  Webhook,
  Send,
  MessageSquare,
  Briefcase,
  Inbox,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isValidUrl, isValidEmail } from "@/lib/utils"
import { formsApi, PUBLIC_BASE_URL as baseUrl } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const PRESETS = [
  {
    id: "contact",
    name: "Contact Form",
    icon: Mail,
    description: "General customer inquiries & contact forms",
    defaultName: "Website Contact Form",
    defaultDesc: "Direct contact form on homepage",
    tags: ["contact", "inquiry"],
    fileUpload: false,
    autoReply: false,
  },
  {
    id: "newsletter",
    name: "Newsletter & Waitlist",
    icon: Inbox,
    description: "Collect email signups and waitlist leads",
    defaultName: "Product Waitlist",
    defaultDesc: "Landing page pre-launch waitlist",
    tags: ["newsletter", "waitlist"],
    fileUpload: false,
    autoReply: true,
  },
  {
    id: "sales",
    name: "Sales & Inquiries",
    icon: Briefcase,
    description: "Enterprise demo requests and quote forms",
    defaultName: "Demo Request Form",
    defaultDesc: "High-intent sales lead inquiries",
    tags: ["sales", "leads"],
    fileUpload: false,
    autoReply: true,
  },
  {
    id: "upload",
    name: "Resume / Uploads",
    icon: FileUp,
    description: "Careers, file attachments & document submissions",
    defaultName: "Job Application",
    defaultDesc: "CV and portfolio uploads",
    tags: ["careers", "attachments"],
    fileUpload: true,
    autoReply: false,
  },
  {
    id: "feedback",
    name: "Feedback & Bugs",
    icon: MessageSquare,
    description: "Customer feedback and bug reporting",
    defaultName: "Product Feedback",
    defaultDesc: "User satisfaction and issue reports",
    tags: ["feedback", "support"],
    fileUpload: true,
    autoReply: false,
  },
]

const generateRandomSuffix = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let suffix = ""
  if (window.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(6)
    window.crypto.getRandomValues(randomValues)
    suffix = Array.from(randomValues).map((v) => chars[v % chars.length]).join("")
  } else {
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  return suffix
}

const slugify = (text) =>
  (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

export default function CreateForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activePreset, setActivePreset] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Custom Endpoint Slug state
  const [isCustomSlug, setIsCustomSlug] = useState(false)
  const [customSlug, setCustomSlug] = useState("")

  // Form Configuration State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: "",
    redirectUrl: "",
    notificationEmail: "",
    webhookUrl: "",
    discordWebhookUrl: "",
    slackWebhookUrl: "",
    notifyEmail: true,
    autoReplyEnabled: false,
    autoReplySubject: "Thank you for reaching out!",
    autoReplyBody: "Hi {{name}},\n\nWe have received your submission and will get back to you shortly.\n\nBest regards,\nThe Team",
    spamEngine: "honeypot",
    allowedDomains: "*",
    fileUploadsEnabled: false,
    maxFileSizeMb: 10,
    allowedFileTypes: ".pdf, .doc, .docx, .png, .jpg",
  })

  const applyPreset = (preset) => {
    setActivePreset(preset.id)
    const baseSlug = slugify(preset.defaultName)
    setFormData((prev) => ({
      ...prev,
      name: preset.defaultName,
      description: preset.defaultDesc,
      tags: preset.tags.join(", "),
      fileUploadsEnabled: preset.fileUpload,
      autoReplyEnabled: preset.autoReply,
    }))
    if (!isCustomSlug) {
      setCustomSlug(`${baseSlug}-${generateRandomSuffix()}`)
    }
    setError("")
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const val = type === "checkbox" ? checked : value
    setFormData((prev) => ({ ...prev, [name]: val }))
    if (error) setError("")

    // Update auto-generated slug if user changes name and hasn't toggled custom slug
    if (name === "name" && !isCustomSlug) {
      const base = slugify(value) || "form"
      setCustomSlug(`${base}-${generateRandomSuffix()}`)
    }
  }

  const handleCustomSlugToggle = (enabled) => {
    setIsCustomSlug(enabled)
    if (enabled && !customSlug) {
      setCustomSlug(slugify(formData.name) || "my-form")
    }
  }

  const computedEndpoint = isCustomSlug
    ? slugify(customSlug) || "form"
    : customSlug || `${slugify(formData.name) || "form"}-${generateRandomSuffix()}`

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError("Form name is required")
      return
    }

    if (formData.redirectUrl && !isValidUrl(formData.redirectUrl)) {
      setError("Please enter a valid URL starting with http:// or https://")
      return
    }

    if (formData.notificationEmail && !isValidEmail(formData.notificationEmail)) {
      setError("Please enter a valid notification email address")
      return
    }

    if (formData.webhookUrl && !isValidUrl(formData.webhookUrl)) {
      setError("Webhook URL must be a valid URL starting with http:// or https://")
      return
    }

    setLoading(true)
    try {
      const parsedTags = formData.tags
        ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : []

      const parsedFileTypes = formData.allowedFileTypes
        ? formData.allowedFileTypes.split(",").map((t) => t.trim()).filter(Boolean)
        : []

      const parsedDomains = formData.allowedDomains
        ? formData.allowedDomains.split(",").map((d) => d.trim()).filter(Boolean)
        : ["*"]

      const payload = {
        name: formData.name.trim(),
        endpoint: computedEndpoint,
        description: formData.description.trim() || null,
        redirect_url: formData.redirectUrl.trim() || null,
        notification_email: formData.notificationEmail.trim() || null,
        webhook_url: formData.webhookUrl.trim() || null,
        discord_webhook_url: formData.discordWebhookUrl.trim() || null,
        slack_webhook_url: formData.slackWebhookUrl.trim() || null,
        tags: parsedTags,
        notify_email: Boolean(formData.notifyEmail),
        auto_reply_enabled: Boolean(formData.autoReplyEnabled),
        auto_reply_subject: formData.autoReplyEnabled ? formData.autoReplySubject : null,
        auto_reply_body: formData.autoReplyEnabled ? formData.autoReplyBody : null,
        spam_engine: formData.spamEngine,
        allowed_domains: parsedDomains,
        file_uploads_enabled: Boolean(formData.fileUploadsEnabled),
        max_file_size_mb: parseInt(formData.maxFileSizeMb, 10) || 10,
        allowed_file_types: parsedFileTypes,
      }

      const response = await formsApi.create(payload)
      const newForm = response?.data?.form || response?.data
      if (!newForm?.id) {
        throw new Error("Failed to create form")
      }

      toast({
        title: "Form created! 🎉",
        description: `Endpoint /f/${newForm.endpoint} is ready for submissions.`,
      })

      navigate(`/forms/${newForm.id}`)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to create form"
      setError(msg)
      toast({
        title: "Could not create form",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-xl h-9 w-9">
          <Link to="/forms">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Create Form Endpoint</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Set up custom endpoint slugs, notifications, auto-responders, and spam protection
          </p>
        </div>
      </div>

      {/* Preset Selection Cards */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Quick Start Presets (Optional)
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {PRESETS.map((p) => {
            const Icon = p.icon
            const isSelected = activePreset === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-border/70 hover:border-border hover:bg-muted/40 bg-card"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xs font-semibold truncate text-foreground">{p.name}</div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">{p.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Card: Basic Configuration */}
        <Card className="bezel-card border-border/80 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-base font-bold font-display">Basic Information</CardTitle>
            <CardDescription className="text-xs">
              Essential endpoint identifier and friendly title
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {/* Form Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Form Name *
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Website Contact Form"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-background border-border/80 text-sm h-10 rounded-xl"
              />
            </div>

            {/* Custom Endpoint Slug Option */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="custom-slug-toggle" className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer">
                    <LinkIcon className="h-3.5 w-3.5 text-primary" />
                    Custom Endpoint Slug
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Choose a human-readable URL slug instead of an auto-generated random string
                  </p>
                </div>
                <Switch
                  id="custom-slug-toggle"
                  checked={isCustomSlug}
                  onCheckedChange={handleCustomSlugToggle}
                />
              </div>

              {isCustomSlug && (
                <div className="pt-2">
                  <div className="flex items-center rounded-xl border border-border/80 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
                    <span className="px-3 py-2 text-xs font-mono text-muted-foreground bg-muted/40 border-r border-border/60 select-none">
                      /f/
                    </span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(slugify(e.target.value))}
                      placeholder="my-contact-form"
                      className="flex-1 px-3 py-2 text-xs font-mono bg-transparent focus:outline-none text-foreground"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Only lowercase letters, numbers, and hyphens. Must be globally unique on this instance.
                  </p>
                </div>
              )}

              {/* Real-Time Live URL Preview */}
              <div className="pt-1 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Target URL
                </span>
                <span className="truncate text-foreground font-semibold">
                  {baseUrl}/f/{computedEndpoint}
                </span>
              </div>
            </div>

            {/* Description & Tags */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="e.g. Inquiries from home page"
                  value={formData.description}
                  onChange={handleChange}
                  className="bg-background border-border/80 text-sm h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags (Comma separated)
                </Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="marketing, landing, v2"
                  value={formData.tags}
                  onChange={handleChange}
                  className="bg-background border-border/80 text-sm h-10 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Options Accordion */}
        <div className="border border-border/80 rounded-2xl bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
          >
            <div>
              <div className="text-sm font-bold font-display flex items-center gap-2 text-foreground">
                Advanced Form Options
                <span className="text-[11px] font-normal text-muted-foreground">
                  (Notifications, Auto-Reply, Redirects, Spam, Files)
                </span>
              </div>
            </div>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-6 pt-2 border-t border-border/40">
              <Tabs defaultValue="notifications" className="space-y-5">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="notifications" className="text-xs">
                    <Bell className="h-3.5 w-3.5 mr-1.5" />
                    Alerts
                  </TabsTrigger>
                  <TabsTrigger value="workflow" className="text-xs">
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Responses
                  </TabsTrigger>
                  <TabsTrigger value="security" className="text-xs">
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    Spam & CORS
                  </TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">
                    <FileUp className="h-3.5 w-3.5 mr-1.5" />
                    Attachments
                  </TabsTrigger>
                </TabsList>

                {/* 1. Notifications Tab */}
                <TabsContent value="notifications" className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="notificationEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Notification Email
                    </Label>
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
                      Instant submission emails will be delivered here using your SMTP credentials.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Custom Webhook URL
                    </Label>
                    <Input
                      id="webhookUrl"
                      name="webhookUrl"
                      type="url"
                      placeholder="https://api.yourdomain.com/webhooks/leads"
                      value={formData.webhookUrl}
                      onChange={handleChange}
                      className="bg-background border-border/80 text-sm h-10 rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Receives JSON payload on every valid submission (ideal for Zapier, Make, n8n).
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-1">
                    <div className="space-y-2">
                      <Label htmlFor="discordWebhookUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Discord Webhook URL
                      </Label>
                      <Input
                        id="discordWebhookUrl"
                        name="discordWebhookUrl"
                        type="url"
                        placeholder="https://discord.com/api/webhooks/..."
                        value={formData.discordWebhookUrl}
                        onChange={handleChange}
                        className="bg-background border-border/80 text-sm h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slackWebhookUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Slack Webhook URL
                      </Label>
                      <Input
                        id="slackWebhookUrl"
                        name="slackWebhookUrl"
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={formData.slackWebhookUrl}
                        onChange={handleChange}
                        className="bg-background border-border/80 text-sm h-10 rounded-xl"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* 2. Responses & Redirects Tab */}
                <TabsContent value="workflow" className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="redirectUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Custom Redirect URL (Thank You Page)
                    </Label>
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
                      Optional: regular HTML form submits will redirect here after saving.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-reply-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                          Send Submitter Auto-Responder Email
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Automatically send an email confirmation to the visitor who submitted the form
                        </p>
                      </div>
                      <Switch
                        id="auto-reply-toggle"
                        name="autoReplyEnabled"
                        checked={formData.autoReplyEnabled}
                        onCheckedChange={(checked) => setFormData((p) => ({ ...p, autoReplyEnabled: checked }))}
                      />
                    </div>

                    {formData.autoReplyEnabled && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Email Subject</Label>
                          <Input
                            name="autoReplySubject"
                            value={formData.autoReplySubject}
                            onChange={handleChange}
                            placeholder="Thank you for reaching out!"
                            className="bg-background text-xs h-9 rounded-lg"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                            Email Body (Supports <code className="text-primary font-mono text-[10px]">&#123;&#123;name&#125;&#125;</code>, <code className="text-primary font-mono text-[10px]">&#123;&#123;message&#125;&#125;</code>)
                          </Label>
                          <textarea
                            name="autoReplyBody"
                            value={formData.autoReplyBody}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* 3. Security & Spam Tab */}
                <TabsContent value="security" className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="spamEngine" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Spam Engine
                    </Label>
                    <select
                      id="spamEngine"
                      name="spamEngine"
                      value={formData.spamEngine}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="honeypot">Invisible Honeypot (Built-in Zero Setup)</option>
                      <option value="turnstile">Cloudflare Turnstile</option>
                      <option value="recaptcha">Google reCAPTCHA</option>
                      <option value="altcha">Altcha (Proof of Work)</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      Honeypot is completely invisible to visitors and blocks 99% of automated bots out-of-the-box.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allowedDomains" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Allowed Domains / CORS Whitelist
                    </Label>
                    <Input
                      id="allowedDomains"
                      name="allowedDomains"
                      placeholder="* or yourdomain.com, staging.yourdomain.com"
                      value={formData.allowedDomains}
                      onChange={handleChange}
                      className="bg-background border-border/80 text-sm h-10 rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Use <code className="font-mono text-primary">*</code> to allow any domain, or comma-separate specific websites to block cross-site abuse.
                    </p>
                  </div>
                </TabsContent>

                {/* 4. File Uploads Tab */}
                <TabsContent value="files" className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="file-upload-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                          Enable File Attachments
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Allow visitors to upload resumes, documents, screenshots, and archives
                        </p>
                      </div>
                      <Switch
                        id="file-upload-toggle"
                        name="fileUploadsEnabled"
                        checked={formData.fileUploadsEnabled}
                        onCheckedChange={(checked) => setFormData((p) => ({ ...p, fileUploadsEnabled: checked }))}
                      />
                    </div>

                    {formData.fileUploadsEnabled && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Max File Size (MB)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            name="maxFileSizeMb"
                            value={formData.maxFileSizeMb}
                            onChange={handleChange}
                            className="bg-background text-xs h-9 rounded-lg"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Allowed File Extensions</Label>
                          <Input
                            name="allowedFileTypes"
                            value={formData.allowedFileTypes}
                            onChange={handleChange}
                            placeholder=".pdf, .png, .jpg, .docx"
                            className="bg-background text-xs h-9 rounded-lg"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Comma-separated list of permitted extensions (e.g. .pdf, .jpg, .png, .zip)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="shadow-sm shadow-primary/25 min-w-[140px] gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {loading ? "Creating Endpoint..." : "Create Form"}
          </Button>
          <Button type="button" variant="outline" asChild className="rounded-xl">
            <Link to="/forms">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
