# ⚡ GetForms — Modern Open-Source Form Backend & Form-to-Email Service

> **The lightweight, high-performance, self-hosted alternative to Formspree, Formcarry, and Basin.**  
> Add one `action` attribute to any HTML form and start collecting submissions instantly. No server-side code needed.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Author: Lucky Yaduvanshi](https://img.shields.io/badge/Author-Lucky_Yaduvanshi-indigo.svg)](https://github.com/Luckyyaduvanshiofficial)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](#)
[![Fastify](https://img.shields.io/badge/Fastify-v5-000000?logo=fastify&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](#)
[![SQLite / PostgreSQL](https://img.shields.io/badge/Database-SQLite%20%7C%20Postgres-4169E1?logo=postgresql&logoColor=white)](#)

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
