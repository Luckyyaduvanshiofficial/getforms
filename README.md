<div align="center">

# GetForms — Modern Open-Source Form Backend & Form-to-Email Service

**The lightweight, high-performance, developer-first alternative to Formspree, Basin, FormBee, and Formcarry.**  
*Add one action attribute to any HTML form and receive instant submissions. Free self-hosted & free managed cloud.*

[![Free Cloud Managed Service](https://img.shields.io/badge/Free_Cloud-getforms.codaipro.com-10b981?style=for-the-badge&logo=cloudflare&logoColor=white)](https://getforms.codaipro.com)
[![CI](https://img.shields.io/github/actions/workflow/status/Luckyyaduvanshiofficial/getforms/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=CI)](https://github.com/Luckyyaduvanshiofficial/getforms/actions)
[![Release](https://img.shields.io/github/v/release/Luckyyaduvanshiofficial/getforms?style=for-the-badge&color=f59e0b)](https://github.com/Luckyyaduvanshiofficial/getforms/releases)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-3b82f6.svg?style=for-the-badge)](./LICENSE)
[![Author: Lucky Yaduvanshi](https://img.shields.io/badge/Author-Lucky_Yaduvanshi-6366f1.svg?style=for-the-badge)](https://github.com/Luckyyaduvanshiofficial)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-22c55e?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![Fastify](https://img.shields.io/badge/Fastify-v5-000000?style=for-the-badge&logo=fastify&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-19-06b6d4?style=for-the-badge&logo=react&logoColor=white)](#)
[![SQLite / PostgreSQL](https://img.shields.io/badge/Database-SQLite%20%7C%20Postgres-8b5cf6?style=for-the-badge&logo=postgresql&logoColor=white)](#)

<br/>

> 🌐 **Don't want to host it yourself?** Use our **100% Free Managed Cloud Service** at **[getforms.codaipro.com](https://getforms.codaipro.com)**!  
> No credit card required, zero server maintenance, instant setup, and full dashboard access.

</div>

---

## ☁️ Free Cloud vs. Self-Hosted: You Choose!

| Feature / Benefit | 🌐 **GetForms Free Cloud** (`getforms.codaipro.com`) | 💻 **GetForms Self-Hosted** |
| :--- | :--- | :--- |
| **Best For** | Developers, agencies, and founders who want an instant solution without server management | Teams requiring 100% data sovereignty, custom intranets, or air-gapped setups |
| **Setup Time** | **< 30 seconds** (Just sign up and copy your form endpoint) | **< 2 minutes** (`git clone` & `npm start` with embedded SQLite) |
| **Pricing** | **100% FREE** — No subscriptions, no hidden limits, no credit card required | **100% FREE** — Unlimited forever on your own hardware |
| **Server Maintenance** | **Zero maintenance** — Managed, upgraded, and backed up for you | Single Docker container or lightweight Node.js process |
| **Access URL** | **[https://getforms.codaipro.com](https://getforms.codaipro.com)** | Runs on `http://localhost:3001` or your custom domain |
| **Custom Slugs** | Supported (`/f/contact-sales`, `/f/newsletter`) | Supported (`/f/contact-sales`, `/f/newsletter`) |
| **Spam Protection** | Cloudflare Turnstile, Altcha PoW, Honeypot, Google reCAPTCHA | Cloudflare Turnstile, Altcha PoW, Honeypot, Google reCAPTCHA |
| **Multi-Channel Alerts**| Email (SMTP/Resend), Discord, Telegram, Slack, Webhooks | Email (SMTP/Resend), Discord, Telegram, Slack, Webhooks |

---

## 🚀 Quick Example

Add your endpoint URL to any HTML form:

```html
<form action="http://your-domain.com/f/contact-sales" method="POST">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message"></textarea>
  <button type="submit">Send Message</button>
</form>
```

That's it! Submissions appear on your dashboard instantly in real time and are delivered to your email, Discord, Telegram, or Webhooks.

---

## ✨ Features & Architecture

GetForms was engineered to provide a self-contained, high-performance submission backend with zero third-party dependencies:

| Feature | GetForms Advantage |
| :--- | :--- |
| **🚀 Instant Zero-Config Boot** | Runs out-of-the-box using embedded **SQLite WAL mode** (zero Docker or Postgres installation needed!). Switch to **PostgreSQL** or **Neon DB** in production simply by setting `DATABASE_URL`. |
| **📥 Submissions Triage Inbox** | Full workflow management: status tracking (`new`, `in_progress`, `resolved`), read/unread state, internal notes, search across all fields, archive, and CSV export. |
| **🛡️ Modern Multi-Layer Spam Defense** | Invisible honeypots, **Cloudflare Turnstile**, **Altcha (Proof-of-Work)**, **Google reCAPTCHA v2/v3**, and domain/CORS origin whitelists. |
| **🔁 Asynchronous Queue with Retries** | Never loses an email or webhook. Failed deliveries automatically retry with exponential backoff and jitter. Submissions return in **< 15ms**. |
| **💌 Submitter Auto-Responder** | Automatically send customizable thank-you emails (`{{name}}`, `{{message}}`) to people who submit your forms. |
| **📬 Newsletter Double Opt-In** | Built-in verification links and confirmation workflows for waitlists and newsletters. |
| **💬 Multi-Channel Integrations** | Native dispatchers for **Email (SMTP/Resend)**, **Discord Rich Embeds**, **Telegram Bot**, **Slack**, and **JSON Webhooks** with HMAC-SHA256 signatures. |
| **📎 File Attachments** | Secure multipart file upload support with MIME-type restriction, size limits, and instant dashboard download links. |
| **🌐 Dynamic Hosted Form Pages** | Instantly share a standalone form at `/f/:endpoint` with customizable colors and styling if you don't have a website ready yet. |
| **🎨 Agency-Tier Modern UI** | Built with **Plus Jakarta Sans**, **Chillax**, **JetBrains Mono**, double-bezel card architecture, and dark/light modes. |
| **⚡ Unified Full-Stack Binary** | Single process runs both the Fastify v5 API and the React 19 dashboard, consuming **under 100MB RAM**. |

---

## 🥊 How GetForms Compares to the Competition

Why build or switch to **GetForms**? Most existing form backend services are either **expensive closed-source commercial platforms** that penalize your growth with strict submission caps and monthly fees, or **half-baked open-source scripts** that lack clean UI, modern spam protection, and reliable queuing.

Here is an honest, direct feature comparison between **GetForms**, **Formspree**, **FormBee**, **Formcarry**, and **Basin**:

| Capability / Feature | ⚡ **GetForms** | 🟠 **Formspree** | 🐝 **FormBee** | 📦 **Formcarry** | 💧 **Basin** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pricing Model** | **100% Free** (Self-Host or [getforms.codaipro.com](https://getforms.codaipro.com)) | Freemium ($10 – $100+/mo) | Cloud requires monthly pay | $15 – $99+/month | $8 – $36+/month |
| **Monthly Submission Limit** | **Unlimited** | 50/month (Free) | Plan-capped | 100/mo (Free) | 250/mo (Free) |
| **Open-Source License** | **Apache 2.0 (100% Open)** | Closed-Source SaaS | Open Core (Cloud paywalled) | Closed-Source SaaS | Closed-Source SaaS |
| **Zero-Config Database** | **Embedded SQLite WAL** (or Postgres) | Managed only | Requires external DB + Redis | Managed only | Managed only |
| **Memory Footprint** | **< 100MB RAM** (Fastify v5 + SQLite) | Unknown | Heavy (Multiple containers) | Unknown | Unknown |
| **Modern Anti-Spam** | **Turnstile + Altcha + Honeypot + reCAPTCHA** | Google reCAPTCHA only | Basic honeypot | Google reCAPTCHA | Google reCAPTCHA / hCaptcha |
| **Double Opt-In Newsletters** | **Included Built-in** | Paid add-on ($25+/mo) | ❌ Not available | ❌ Not available | ❌ Not available |
| **Auto-Responder Emails** | **Included Built-in** | Paid plans only | Basic text only | Paid plans only | Paid plans only |
| **Multi-Channel Dispatch** | **Email, Discord, Telegram, Slack, Webhooks** | Email & basic Webhook | Email only | Email, Slack, Zapier | Email, Slack, Webhooks |
| **Async Retries & Queue** | **Exponential backoff with jitter** | Standard | No built-in retry queue | Basic | Basic |
| **Webhook HMAC Signatures** | **Native HMAC-SHA256** | Paid plans only | ❌ None | Paid plans only | Paid plans only |
| **Multipart File Uploads** | **Included (Local/S3 configurable)** | Paid ($25+/mo) | Limited local | Paid ($15+/mo) | Paid ($12+/mo) |
| **Dashboard UI Quality** | **Agency-tier (React 19 + Double Bezel)** | Generic standard UI | Dated / clunky | Standard dashboard | Minimalist |
| **1-Click Test Submissions** | **Built right into endpoint view** | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual |

### 🔍 Deep-Dive: Why GetForms Wins

1. **No Submission "Tax" on Growth**:
   - Closed-source SaaS products like **Formspree**, **Formcarry**, and **Basin** charge aggressive monthly subscription fees the moment your site gets traffic. If your marketing campaign goes viral, they either truncate submissions or lock your account behind a $100/mo paywall.
   - **GetForms gives you unlimited submissions forever** — whether you self-host or use our free managed cloud.

2. **Zero Setup Friction (SQLite WAL Mode)**:
   - Self-hosting **FormBee** or similar projects often requires orchestrating multiple heavyweight Docker services (PostgreSQL, Redis, background worker daemons, and Nginx).
   - **GetForms boots in 1 single command**. It uses embedded **SQLite in WAL mode**, handling hundreds of concurrent submissions per second on a $4/month VPS or Raspberry Pi. Need high-availability clustering? Simply set `DATABASE_URL=postgresql://...`.

3. **Privacy-Respecting Anti-Spam (Turnstile & Altcha)**:
   - Competitors rely exclusively on Google reCAPTCHA, forcing invasive tracking cookies on your visitors and annoying them with crosswalk image puzzles.
   - **GetForms includes Cloudflare Turnstile** (frictionless 1-second challenge) and **Altcha (Proof-of-Work)**, which runs cryptographically on the client with zero cookies and 100% GDPR compliance.

4. **Multi-Channel Dispatch out of the Box**:
   - With other services, receiving an alert in Discord or Telegram requires setting up Zapier or Make.com (which costs additional money).
   - **GetForms natively formats and dispatches beautiful Rich Embeds to Discord, Markdown to Telegram, and payload notifications to Slack**.

5. **Submissions Triage Inbox**:
   - Most open-source form backends just dump JSON into a table. GetForms includes an **agency-tier triage workflow**: tag submissions, mark them `new`, `in_progress`, or `resolved`, write internal admin notes, search across form fields, and export clean CSVs with one click.

---

## 📖 Developer Integration Guide

### 1. Plain HTML Form (Standard POST)

Add your endpoint URL to the `action` attribute. Works with any static HTML site, Webflow, WordPress, Carrd, Ghost, or Framer:

```html
<form action="https://getforms.codaipro.com/f/your-form-slug" method="POST">
  <!-- Standard fields -->
  <label for="name">Full Name</label>
  <input type="text" id="name" name="name" required />

  <label for="email">Work Email</label>
  <input type="email" id="email" name="email" required />

  <label for="message">Project Details</label>
  <textarea id="message" name="message" rows="4" required></textarea>

  <!-- Optional custom redirect after submission -->
  <input type="hidden" name="_next" value="https://yourwebsite.com/thank-you" />

  <button type="submit">Send Message</button>
</form>
```

---

### 2. Modern JavaScript (`fetch` / AJAX)

Submit asynchronously without page reloads, showing custom loading spinners and success states:

```javascript
const form = document.querySelector("#contact-form");
const statusDiv = document.querySelector("#form-status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusDiv.textContent = "Sending...";

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch("https://getforms.codaipro.com/f/your-form-slug", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.ok && result.success) {
      statusDiv.textContent = "Thank you! Your message has been sent.";
      form.reset();
    } else {
      statusDiv.textContent = result.error || "Submission failed. Please try again.";
    }
  } catch (err) {
    statusDiv.textContent = "Network error. Please check your connection.";
  }
});
```

---

### 3. React & Next.js (App Router / Pages Router)

A clean, production-ready React component with pending state, feedback toast, and error handling:

```tsx
"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("https://getforms.codaipro.com/f/your-form-slug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (response.ok && json.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(json.error || "Something went wrong.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("Network error. Please try again later.");
    }
  }

  if (status === "success") {
    return (
      <div className="p-6 bg-emerald-50 text-emerald-800 rounded-xl">
        <h3 className="font-semibold text-lg">Message Received!</h3>
        <p className="mt-1 text-sm">Thank you for reaching out. We will get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input name="name" required className="w-full border rounded-lg p-2.5 mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input type="email" name="email" required className="w-full border rounded-lg p-2.5 mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium">Message</label>
        <textarea name="message" rows={4} required className="w-full border rounded-lg p-2.5 mt-1" />
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition"
      >
        {status === "loading" ? "Submitting..." : "Send Message"}
      </button>
    </form>
  );
}
```

---

### 4. Astro / Svelte / Vue

For Astro components, Svelte, or Vue 3:

```astro
---
// Astro Component: Contact.astro
---
<form
  action="https://getforms.codaipro.com/f/your-form-slug"
  method="POST"
  class="flex flex-col gap-4 max-w-md mx-auto"
>
  <input type="text" name="name" placeholder="Name" required class="input" />
  <input type="email" name="email" placeholder="Email" required class="input" />
  <textarea name="feedback" placeholder="Your Feedback" class="textarea"></textarea>
  <button type="submit" class="btn-primary">Submit Feedback</button>
</form>
```

---

## 🛡️ Anti-Spam & Advanced Features

### 1. Invisible Honeypot (Zero Friction for Users)

Block automated spam bots with zero impact on human visitors. Add a hidden input field named `_gotcha`:

```html
<form action="https://getforms.codaipro.com/f/your-form-slug" method="POST">
  <!-- Bot honeypot: hidden from real humans via CSS -->
  <div style="display:none;" aria-hidden="true">
    <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" />
  </div>

  <input type="text" name="name" placeholder="Your Name" required />
  <button type="submit">Submit</button>
</form>
```
*If a spambot automatically fills this field, GetForms silently flags and drops the submission.*

---

### 2. Cloudflare Turnstile Integration

Cloudflare Turnstile delivers invisible, frictionless CAPTCHA without tracking cookies:

1. Enable **Cloudflare Turnstile** in your form's Advanced Settings tab in GetForms and enter your Secret Key.
2. In your HTML, add the Turnstile script and widget:

```html
<!-- Load Cloudflare Turnstile script -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<form action="https://getforms.codaipro.com/f/your-form-slug" method="POST">
  <input type="text" name="name" placeholder="Your Name" required />
  
  <!-- Turnstile widget -->
  <div class="cf-turnstile" data-sitekey="YOUR_CLOUDFLARE_SITEKEY"></div>

  <button type="submit">Send</button>
</form>
```

---

### 3. Altcha Proof-of-Work (GDPR Compliant & Cookie-Free)

Altcha uses a cryptographic proof-of-work challenge processed entirely on the visitor's device:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js"></script>

<form action="https://getforms.codaipro.com/f/your-form-slug" method="POST">
  <input type="email" name="email" placeholder="Your Email" required />
  
  <!-- Altcha PoW widget -->
  <altcha-widget challengeurl="https://getforms.codaipro.com/api/altcha-challenge"></altcha-widget>

  <button type="submit">Subscribe</button>
</form>
```

---

### 4. Multipart File Uploads

Collect resumes, PDF reports, screenshots, or receipts directly through your forms:

```html
<form 
  action="https://getforms.codaipro.com/f/your-form-slug" 
  method="POST" 
  enctype="multipart/form-data"
>
  <input type="text" name="applicant_name" placeholder="Full Name" required />
  <input type="email" name="applicant_email" placeholder="Email" required />

  <!-- File input: supports images, PDFs, documents up to configured size limit -->
  <label for="resume">Upload Resume (PDF, DOCX up to 10MB):</label>
  <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx" required />

  <button type="submit">Submit Application</button>
</form>
```

*Uploaded files are securely hashed, stored with MIME verification, and accessible directly in your GetForms submission inbox.*

---

### 5. Webhooks & HMAC-SHA256 Signature Verification

Every submission can trigger an instant JSON HTTP POST to your external API, Zapier, or microservice.

#### Webhook Payload Schema:
```json
{
  "event": "form_submission",
  "form_id": "frm_abc123",
  "endpoint": "contact-sales",
  "submission_id": "sub_xyz789",
  "created_at": "2026-09-26T12:00:00.000Z",
  "data": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Looking for an enterprise quote"
  },
  "files": []
}
```

#### Verifying Webhook Signatures (Node.js):
If a Webhook Secret is configured, GetForms computes an HMAC signature and passes it in the `X-GetForms-Signature` header:

```javascript
import crypto from "node:crypto";

function verifyGetFormsWebhook(rawBody, signatureHeader, secret) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
}
```

---

### 6. Special Reserved Parameters

Customize form behavior using these built-in query or input parameters:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `_next` | Hidden Input / Param | Redirects user to a custom URL upon successful submission (e.g. `/thank-you`). |
| `_subject` | Hidden Input / Param | Customizes the email notification subject line (e.g. `New Sales Lead from {{name}}`). |
| `_replyto` / `email` | Input | Automatically sets the `Reply-To` header in email alerts so you can hit "Reply" in your inbox. |
| `_gotcha` | Hidden Input | Anti-spam honeypot field. Must be left blank by legitimate humans. |
| `_optin` | Hidden Input | Triggers double opt-in verification flow for newsletter or waitlist signups. |

---

## 🏁 Quick Start

### 1. Requirements
- Node.js 20+ installed

### 2. Installation
```bash
git clone https://github.com/Luckyyaduvanshiofficial/getforms.git
cd getforms

# Install dependencies for both backend and frontend
npm run install:all

# Build frontend dashboard
npm run build

# Start the unified server
npm start
```

Open your browser at **[http://localhost:3001](http://localhost:3001)**!

### 3. Default Login & First-Run Setup
On first boot, an administrator account is initialized automatically:
- **Username**: `admin` (or `admin@getform.local`)
- **Password**: `admin123`

*(Make sure to change your password in Account settings after logging in, or use the First-Run Setup wizard at `/setup`).*

### 4. Database Maintenance & Reset
For clean self-host installations or testing:
```bash
# Purge all test submissions and reset submission counts
npm run db:clean

# Purge submissions AND test forms
node backend/scripts/clean-db.js --all

# Reset local SQLite database completely to start fresh
npm run db:reset
```

---

## 🐳 Docker Compose Self-Hosting

Run GetForms in production with Caddy (automatic SSL HTTPS) and PostgreSQL:

```bash
# 1. Copy production environment file
cp .env.example .env

# 2. Fill in DOMAIN, JWT_SECRET, and SMTP credentials in .env
nano .env

# 3. Start containers in background
docker compose up -d --build
```

Caddy will automatically provision Let's Encrypt SSL certificates for your `$DOMAIN`.

---

## ⚙️ Configuration (.env)

Create a `.env` file in `backend/.env` (or copy from `.env.example`):

```bash
# Server Port
PORT=3001
HOST=0.0.0.0

# Domain & Security
DOMAIN=forms.yourdomain.com
JWT_SECRET=generate-a-strong-random-32-byte-hex-secret

# Database (Optional - defaults to SQLite getform.db if omitted)
# DATABASE_URL=postgresql://user:password@localhost:5432/getforms

# Global SMTP Credentials (Optional - can also configure per-user in dashboard)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=GetForms <notifications@yourdomain.com>
```

---

## 📜 Authorship & License

- **Author**: [Lucky Yaduvanshi](https://github.com/Luckyyaduvanshiofficial)
- **Repository**: [https://github.com/Luckyyaduvanshiofficial/getforms](https://github.com/Luckyyaduvanshiofficial/getforms)
- **License**: [Apache License 2.0](./LICENSE)

Pursuant to Section 4 of the Apache License 2.0, any fork, derivative, or redistribution MUST retain all copyright notices, author attribution, the [NOTICE](./NOTICE) file, and the [PROVENANCE.md](./PROVENANCE.md) record.
