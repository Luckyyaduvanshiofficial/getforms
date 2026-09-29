// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import sql from '../utils/db.js';
import crypto from 'crypto';
import {
  validateEmailTemplate,
  validateFormEndpoint,
  validateWebhookUrl
} from '../utils/validation.js';
import {
  normalizeEmailConfig,
  normalizeEmailList,
  normalizeSingleEmail
} from '../utils/emailSecurity.js';
import { emailHelpers, replaceVariables, sanitizeTemplate, generateDefaultEmailTemplate } from '../utils/mailer.js';
import validator from 'validator';

const INTERNAL_ERROR_MESSAGE = 'Please try again later.';

const SAFE_FORM_COLS = [
  'id', 'user_id', 'name', 'endpoint', 'description', 'tags',
  'active', 'created_at', 'updated_at', 'submission_count', 'logo_url',
  'notification_email', 'notification_emails', 'notification_type', 'redirect_url',
  'email_config', 'email_template_enabled', 'email_template_subject', 'email_template_body',
  'webhook_url', 'slack_webhook_url', 'discord_webhook_url',
  'notify_email', 'notify_telegram', 'notify_slack', 'notify_discord',
  'auto_reply_enabled', 'auto_reply_subject', 'auto_reply_body',
  'double_opt_in_enabled', 'confirmation_redirect_url',
  'spam_engine', 'turnstile_secret_key', 'recaptcha_secret_key', 'altcha_secret_key',
  'allowed_domains', 'file_uploads_enabled', 'max_file_size_mb', 'allowed_file_types',
  'blocklist', 'close_after_submissions', 'close_at'
].join(', ');

const ALLOWED_UPDATE_FIELDS = new Set([
  'name', 'description', 'active', 'redirect_url',
  'notification_email', 'notification_emails', 'notification_type',
  'webhook_url', 'slack_webhook_url', 'discord_webhook_url',
  'notify_email', 'notify_telegram', 'notify_slack', 'notify_discord',
  'email_config', 'email_template_enabled', 'email_template_subject', 'email_template_body',
  'auto_reply_enabled', 'auto_reply_subject', 'auto_reply_body',
  'double_opt_in_enabled', 'confirmation_redirect_url',
  'spam_engine', 'turnstile_secret_key', 'recaptcha_secret_key', 'altcha_secret_key',
  'allowed_domains', 'file_uploads_enabled', 'max_file_size_mb', 'allowed_file_types',
  'logo_url', 'blocklist', 'close_after_submissions', 'close_at', 'tags'
]);

function pickAllowed(payload = {}) {
  return Object.entries(payload).reduce((acc, [k, v]) => {
    if (ALLOWED_UPDATE_FIELDS.has(k)) acc[k] = v;
    return acc;
  }, {});
}

function normalizeEmailSettings(updates = {}) {
  const out = { ...updates };

  if ('notification_email' in out) {
    const r = normalizeSingleEmail(out.notification_email, { fieldName: 'notification email', allowEmpty: true });
    if (!r.valid) return r;
    out.notification_email = r.normalized;
  }
  if ('notification_emails' in out) {
    const r = normalizeEmailList(out.notification_emails, { fieldName: 'notification_emails', allowEmpty: true });
    if (!r.valid) return r;
    out.notification_emails = r.normalized;
  }
  if ('email_config' in out) {
    const r = normalizeEmailConfig(out.email_config, { allowEmpty: true });
    if (!r.valid) return r;
    out.email_config = r.normalized;
  }

  return { valid: true, normalized: out };
}

// ─── Real-Time Server-Sent Events (SSE) Map ──────────────────────────────────
const sseClients = new Map(); // formId -> Set(reply)

export function broadcastSubmission(formId, submission) {
  const clients = sseClients.get(formId);
  if (!clients || clients.size === 0) return;
  const msg = `data: ${JSON.stringify({ type: 'new_submission', submission })}\n\n`;
  for (const client of clients) {
    try {
      client.raw.write(msg);
    } catch {
      clients.delete(client);
    }
  }
}

export default async function formRoutes(fastify) {
  // GET /api/forms — list user's forms
  fastify.get('/', { preHandler: fastify.auth }, async (request, reply) => {
    try {
      const forms = await sql`
        SELECT id, user_id, name, endpoint, description, tags, active,
               created_at, submission_count, logo_url
        FROM forms
        WHERE user_id = ${request.user.userId}
        ORDER BY created_at DESC
      `;
      return { forms };
    } catch (err) {
      console.error('Error fetching forms:', err);
      return reply.status(500).send({ error: 'Failed to fetch forms', message: INTERNAL_ERROR_MESSAGE });
    }
  });

  // GET /api/forms/:formId/stream — live SSE stream of incoming submissions
  fastify.get('/:formId/stream', { preHandler: fastify.auth }, async (request, reply) => {
    const { formId } = request.params;
    const [form] = await sql`SELECT id FROM forms WHERE id = ${formId} AND user_id = ${request.user.userId}`;
    if (!form) return reply.status(404).send({ error: 'Form not found' });

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders?.();

    if (!sseClients.has(formId)) {
      sseClients.set(formId, new Set());
    }
    const clientSet = sseClients.get(formId);
    if (clientSet.size >= 20) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: 'Too many live connections' })}\n\n`);
      return reply.raw.end();
    }
    clientSet.add(reply);

    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', formId })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);
    heartbeat.unref?.();

    const idleTimeout = setTimeout(() => {
      try { reply.raw.end(); } catch {}
    }, 10 * 60 * 1000);
    idleTimeout.unref?.();

    const cleanup = () => {
      clearInterval(heartbeat);
      clearTimeout(idleTimeout);
      clientSet.delete(reply);
      if (clientSet.size === 0) sseClients.delete(formId);
    };
    request.raw.on('close', cleanup);
    reply.raw.on('close', cleanup);
  });

  // GET /api/forms/:formId
  fastify.get('/:formId', { preHandler: fastify.auth }, async (request, reply) => {
    try {
      const [form] = await sql.unsafe(
        `SELECT ${SAFE_FORM_COLS} FROM forms WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [request.params.formId, request.user.userId]
      );
      if (!form) return reply.status(404).send({ error: 'Form not found' });
      return { form };
    } catch (err) {
      console.error('Error fetching form:', err);
      return reply.status(500).send({ error: 'Failed to fetch form', message: INTERNAL_ERROR_MESSAGE });
    }
  });

  // GET /api/forms/:formId/stats
  fastify.get('/:formId/stats', { preHandler: fastify.auth }, async (request, reply) => {
    try {
      const { formId } = request.params;
      const [form] = await sql`SELECT id FROM forms WHERE id = ${formId} AND user_id = ${request.user.userId}`;
      if (!form) return reply.status(404).send({ error: 'Form not found' });

      const [stats] = await sql`
        SELECT
          COUNT(*) FILTER (WHERE archived = false)                                                          AS total,
          COUNT(*) FILTER (WHERE archived = false AND read_at IS NULL)                                      AS unread,
          COUNT(*) FILTER (WHERE archived = true)                                                           AS archived,
          COUNT(*) FILTER (WHERE archived = false AND created_at >= date_trunc('week', NOW()))              AS this_week,
          COUNT(*) FILTER (WHERE archived = false AND created_at >= date_trunc('day', NOW()))               AS today
        FROM submissions
        WHERE form_id = ${formId}
      `;
      return { stats };
    } catch (err) {
      console.error('Error fetching form stats:', err);
      return reply.status(500).send({ error: 'Failed to fetch stats', message: INTERNAL_ERROR_MESSAGE });
    }
  });

  // POST /api/forms — create form
  fastify.post('/', { preHandler: fastify.auth }, async (request, reply) => {
    try {
      const {
        name, endpoint, custom_slug, slug, description, redirect_url,
        notification_email, notification_emails, email_config,
        webhook_url, slack_webhook_url, discord_webhook_url,
        active = true,
        tags = [],
        notify_email = false,
        notify_telegram = false,
        notify_slack = false,
        notify_discord = false,
        auto_reply_enabled = false,
        auto_reply_subject = null,
        auto_reply_body = null,
        email_template_enabled = false,
        email_template_subject = null,
        email_template_body = null,
        logo_url = null,
        double_opt_in_enabled = false,
        confirmation_redirect_url = null,
        blocklist = [],
        close_after_submissions = null,
        close_at = null,
        spam_engine = 'honeypot',
        turnstile_secret_key = null,
        recaptcha_secret_key = null,
        altcha_secret_key = null,
        allowed_domains = ['*'],
        file_uploads_enabled = false,
        max_file_size_mb = 10,
        allowed_file_types = []
      } = request.body || {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        return reply.status(400).send({ error: 'Form name is required' });
      }
      const trimmedName = name.trim();
      if (trimmedName.length > 120) {
        return reply.status(400).send({ error: 'Form name too long (max 120 chars)' });
      }
      if (description !== undefined && description !== null && String(description).length > 2000) {
        return reply.status(400).send({ error: 'Description too long (max 2000 chars)' });
      }

      let rawEndpoint = endpoint || custom_slug || slug;
      if (!rawEndpoint || typeof rawEndpoint !== 'string' || !rawEndpoint.trim()) {
        const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'form';
        rawEndpoint = `${generatedSlug}-${crypto.randomUUID().slice(0, 8)}`;
      }

      const endpointVal = validateFormEndpoint(rawEndpoint);
      if (!endpointVal.valid) return reply.status(400).send({ error: 'Invalid endpoint slug', message: endpointVal.error });
      const normalizedEndpoint = endpointVal.normalized;

      const emailSettings = normalizeEmailSettings({ notification_email, notification_emails, email_config });
      if (!emailSettings.valid) return reply.status(400).send({ error: 'Invalid email settings', message: emailSettings.error });

      const emailTemplateCheck = validateEmailTemplate({
        email_template_enabled, email_template_subject, email_template_body,
        logo_url, notification_email, notification_emails, email_config
      });
      if (!emailTemplateCheck.valid) return reply.status(400).send({ error: 'Invalid email template', message: emailTemplateCheck.error });

      const allowedEngines = new Set(['honeypot', 'turnstile', 'recaptcha', 'altcha']);
      if (spam_engine && !allowedEngines.has(spam_engine)) {
        return reply.status(400).send({ error: 'Invalid spam_engine', message: 'Must be honeypot, turnstile, recaptcha, or altcha' });
      }
      for (const [field, value] of [['turnstile_secret_key', turnstile_secret_key], ['recaptcha_secret_key', recaptcha_secret_key], ['altcha_secret_key', altcha_secret_key]]) {
        if (value !== null && value !== undefined && String(value).length > 500) {
          return reply.status(400).send({ error: `Invalid ${field}`, message: 'Secret too long (max 500 chars)' });
        }
      }
      if (!Array.isArray(allowed_domains) || allowed_domains.length > 50 || allowed_domains.some(d => typeof d !== 'string' || d.length > 253)) {
        return reply.status(400).send({ error: 'Invalid allowed_domains', message: 'Must be an array of up to 50 hostnames' });
      }

      const parsedMaxFileMb = max_file_size_mb === undefined || max_file_size_mb === null || max_file_size_mb === ''
        ? 10
        : Number(max_file_size_mb);
      if (!Number.isFinite(parsedMaxFileMb) || parsedMaxFileMb < 1 || parsedMaxFileMb > 100) {
        return reply.status(400).send({ error: 'Invalid max_file_size_mb', message: 'Must be 1-100 MB' });
      }
      if (!Array.isArray(allowed_file_types) || allowed_file_types.length > 50 || allowed_file_types.some(t => typeof t !== 'string' || t.length > 127)) {
        return reply.status(400).send({ error: 'Invalid allowed_file_types' });
      }

      if (blocklist !== undefined && blocklist !== null) {
        if (!Array.isArray(blocklist) || blocklist.length > 200) {
          return reply.status(400).send({ error: 'Invalid blocklist', message: 'Must be an array of up to 200 entries' });
        }
        for (const entry of blocklist) {
          if (!entry || typeof entry !== 'object' || !['ip', 'email', 'domain', 'keyword'].includes(entry.type) || typeof entry.value !== 'string' || !entry.value.trim() || entry.value.length > 500) {
            return reply.status(400).send({ error: 'Invalid blocklist', message: 'Each entry needs type ip|email|domain|keyword and a value up to 500 chars' });
          }
        }
      }

      const parsedCloseAfter = close_after_submissions === undefined || close_after_submissions === null || close_after_submissions === ''
        ? null
        : Number(close_after_submissions);
      if (parsedCloseAfter !== null && (!Number.isInteger(parsedCloseAfter) || parsedCloseAfter < 1 || parsedCloseAfter > 1000000)) {
        return reply.status(400).send({ error: 'Invalid close_after_submissions', message: 'Must be an integer 1-1000000' });
      }
      if (close_at !== undefined && close_at !== null && close_at !== '') {
        const closeAtDate = new Date(close_at);
        if (Number.isNaN(closeAtDate.getTime())) {
          return reply.status(400).send({ error: 'Invalid close_at', message: 'Must be a valid date' });
        }
      }

      if (confirmation_redirect_url) {
        try {
          const u = new URL(confirmation_redirect_url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            return reply.status(400).send({ error: 'Invalid confirmation_redirect_url', message: 'Must use http or https' });
          }
        } catch {
          return reply.status(400).send({ error: 'Invalid confirmation_redirect_url', message: 'Must be a valid URL' });
        }
      }

      if (auto_reply_subject !== undefined && auto_reply_subject !== null && String(auto_reply_subject).length > 200) {
        return reply.status(400).send({ error: 'auto_reply_subject too long (max 200 chars)' });
      }
      if (auto_reply_body !== undefined && auto_reply_body !== null && Buffer.byteLength(String(auto_reply_body), 'utf8') > 51200) {
        return reply.status(400).send({ error: 'auto_reply_body too large (max 50KB)' });
      }

      if (redirect_url) {
        try {
          const u = new URL(redirect_url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            return reply.status(400).send({ error: 'Invalid redirect_url', message: 'Redirect URL must use http or https' });
          }
        } catch {
          return reply.status(400).send({ error: 'Invalid redirect_url', message: 'Redirect URL must be a valid URL' });
        }
      }

      for (const [field, value] of [['webhook_url', webhook_url], ['slack_webhook_url', slack_webhook_url], ['discord_webhook_url', discord_webhook_url]]) {
        if (!value) continue;
        const v = await validateWebhookUrl(value, { requireHttps: true });
        if (!v.valid) return reply.status(400).send({ error: `Invalid ${field}`, message: v.error });
      }

      const [existing] = await sql`SELECT id FROM forms WHERE endpoint = ${normalizedEndpoint} LIMIT 1`;
      if (existing) return reply.status(409).send({ error: 'Endpoint already in use' });

      const formId = crypto.randomUUID();
      const [form] = await sql.unsafe(
        `INSERT INTO forms (
          id, user_id, name, endpoint, description, notification_email, redirect_url, email_config,
          webhook_url, slack_webhook_url, discord_webhook_url, active, tags,
          notify_email, notify_telegram, notify_slack, notify_discord,
          auto_reply_enabled, auto_reply_subject, auto_reply_body,
          email_template_enabled, email_template_subject, email_template_body, logo_url,
          double_opt_in_enabled, confirmation_redirect_url,
          spam_engine, turnstile_secret_key, recaptcha_secret_key, altcha_secret_key,
          allowed_domains, file_uploads_enabled, max_file_size_mb, allowed_file_types,
          blocklist, close_after_submissions, close_at,
          created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,NOW(),NOW())
        RETURNING ${SAFE_FORM_COLS}`,
        [
          formId,
          request.user.userId,
          trimmedName,
          normalizedEndpoint,
          description ? String(description).trim().slice(0, 2000) : null,
          emailSettings.normalized.notification_email || null,
          redirect_url || null,
          emailSettings.normalized.email_config ? JSON.stringify(emailSettings.normalized.email_config) : null,
          webhook_url || null,
          slack_webhook_url || null,
          discord_webhook_url || null,
          Boolean(active),
          JSON.stringify(Array.isArray(tags) ? tags.slice(0, 50).map(t => String(t).slice(0, 50)) : []),
          Boolean(notify_email),
          Boolean(notify_telegram),
          Boolean(notify_slack),
          Boolean(notify_discord),
          Boolean(auto_reply_enabled),
          auto_reply_subject ? String(auto_reply_subject).slice(0, 200) : null,
          auto_reply_body ? String(auto_reply_body).slice(0, 51200) : null,
          Boolean(email_template_enabled),
          email_template_subject ? String(email_template_subject).slice(0, 200) : null,
          email_template_body ? String(email_template_body).slice(0, 51200) : null,
          logo_url ? String(logo_url).slice(0, 2000) : null,
          Boolean(double_opt_in_enabled),
          confirmation_redirect_url || null,
          spam_engine || 'honeypot',
          turnstile_secret_key ? String(turnstile_secret_key).slice(0, 500) : null,
          recaptcha_secret_key ? String(recaptcha_secret_key).slice(0, 500) : null,
          altcha_secret_key ? String(altcha_secret_key).slice(0, 500) : null,
          JSON.stringify(Array.isArray(allowed_domains) ? allowed_domains : ['*']),
          Boolean(file_uploads_enabled),
          parsedMaxFileMb,
          JSON.stringify(Array.isArray(allowed_file_types) ? allowed_file_types : []),
          JSON.stringify(Array.isArray(blocklist) ? blocklist : []),
          parsedCloseAfter,
          close_at ? new Date(close_at).toISOString() : null,
        ]
      );

      return reply.status(201).send({ form });
    } catch (err) {
      console.error('Error creating form:', err);
      return reply.status(500).send({ error: 'Failed to create form', message: INTERNAL_ERROR_MESSAGE });
    }
  });

  // PUT /api/forms/:formId — update form
  fastify.put('/:formId', { preHandler: fastify.auth }, async (request, reply) => {
    try {
      const { formId } = request.params;
      const updates = pickAllowed(request.body || {});

      const [existing] = await sql`SELECT id FROM forms WHERE id = ${formId} AND user_id = ${request.user.userId}`;
      if (!existing) return reply.status(404).send({ error: 'Form not found' });

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: 'No valid fields to update' });
      }

      const emailSettings = normalizeEmailSettings(updates);
      if (!emailSettings.valid) return reply.status(400).send({ error: 'Invalid email settings', message: emailSettings.error });
      Object.assign(updates, emailSettings.normalized);

      const templateCheck = validateEmailTemplate(updates);
      if (!templateCheck.valid) return reply.status(400).send({ error: 'Invalid email template', message: templateCheck.error });

      if ('name' in updates) {
        if (typeof updates.name !== 'string' || !updates.name.trim()) {
          return reply.status(400).send({ error: 'Form name is required' });
        }
        updates.name = updates.name.trim().slice(0, 120);
      }
      if ('description' in updates && updates.description !== null && updates.description !== undefined) {
        if (String(updates.description).length > 2000) {
          return reply.status(400).send({ error: 'Description too long (max 2000 chars)' });
        }
        updates.description = String(updates.description).trim().slice(0, 2000);
      }
      if ('spam_engine' in updates && updates.spam_engine) {
        const allowedEngines = new Set(['honeypot', 'turnstile', 'recaptcha', 'altcha']);
        if (!allowedEngines.has(updates.spam_engine)) {
          return reply.status(400).send({ error: 'Invalid spam_engine', message: 'Must be honeypot, turnstile, recaptcha, or altcha' });
        }
      }
      for (const field of ['turnstile_secret_key', 'recaptcha_secret_key', 'altcha_secret_key']) {
        if (field in updates && updates[field] !== null && updates[field] !== undefined && String(updates[field]).length > 500) {
          return reply.status(400).send({ error: `Invalid ${field}`, message: 'Secret too long (max 500 chars)' });
        }
      }
      if ('allowed_domains' in updates) {
        const v = updates.allowed_domains;
        if (!Array.isArray(v) || v.length > 50 || v.some(d => typeof d !== 'string' || d.length > 253)) {
          return reply.status(400).send({ error: 'Invalid allowed_domains', message: 'Must be an array of up to 50 hostnames' });
        }
      }
      if ('max_file_size_mb' in updates) {
        const v = updates.max_file_size_mb === '' || updates.max_file_size_mb === null ? 10 : Number(updates.max_file_size_mb);
        if (!Number.isFinite(v) || v < 1 || v > 100) {
          return reply.status(400).send({ error: 'Invalid max_file_size_mb', message: 'Must be 1-100 MB' });
        }
        updates.max_file_size_mb = v;
      }
      if ('allowed_file_types' in updates) {
        const v = updates.allowed_file_types;
        if (!Array.isArray(v) || v.length > 50 || v.some(t => typeof t !== 'string' || t.length > 127)) {
          return reply.status(400).send({ error: 'Invalid allowed_file_types' });
        }
      }
      if ('blocklist' in updates && updates.blocklist !== null && updates.blocklist !== undefined) {
        const v = updates.blocklist;
        if (!Array.isArray(v) || v.length > 200) {
          return reply.status(400).send({ error: 'Invalid blocklist', message: 'Must be an array of up to 200 entries' });
        }
        for (const entry of v) {
          if (!entry || typeof entry !== 'object' || !['ip', 'email', 'domain', 'keyword'].includes(entry.type) || typeof entry.value !== 'string' || !entry.value.trim() || entry.value.length > 500) {
            return reply.status(400).send({ error: 'Invalid blocklist', message: 'Each entry needs type ip|email|domain|keyword and a value up to 500 chars' });
          }
        }
      }
      if ('close_after_submissions' in updates && updates.close_after_submissions !== null && updates.close_after_submissions !== '') {
        const v = Number(updates.close_after_submissions);
        if (!Number.isInteger(v) || v < 1 || v > 1000000) {
          return reply.status(400).send({ error: 'Invalid close_after_submissions', message: 'Must be an integer 1-1000000' });
        }
        updates.close_after_submissions = v;
      }
      if ('close_at' in updates && updates.close_at !== null && updates.close_at !== '') {
        const d = new Date(updates.close_at);
        if (Number.isNaN(d.getTime())) {
          return reply.status(400).send({ error: 'Invalid close_at', message: 'Must be a valid date' });
        }
        updates.close_at = d.toISOString();
      }
      if ('tags' in updates) {
        if (!Array.isArray(updates.tags)) {
          return reply.status(400).send({ error: 'Invalid tags', message: 'Must be an array' });
        }
        updates.tags = updates.tags.slice(0, 50).map(t => String(t).slice(0, 50));
      }
      if ('confirmation_redirect_url' in updates && updates.confirmation_redirect_url) {
        try {
          const u = new URL(updates.confirmation_redirect_url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            return reply.status(400).send({ error: 'Invalid confirmation_redirect_url', message: 'Must use http or https' });
          }
        } catch {
          return reply.status(400).send({ error: 'Invalid confirmation_redirect_url', message: 'Must be a valid URL' });
        }
      }
      if ('auto_reply_subject' in updates && updates.auto_reply_subject !== null && updates.auto_reply_subject !== undefined && String(updates.auto_reply_subject).length > 200) {
        return reply.status(400).send({ error: 'auto_reply_subject too long (max 200 chars)' });
      }
      if ('auto_reply_body' in updates && updates.auto_reply_body !== null && updates.auto_reply_body !== undefined && Buffer.byteLength(String(updates.auto_reply_body), 'utf8') > 51200) {
        return reply.status(400).send({ error: 'auto_reply_body too large (max 50KB)' });
      }
      if ('email_template_subject' in updates && updates.email_template_subject !== null && updates.email_template_subject !== undefined && String(updates.email_template_subject).length > 200) {
        return reply.status(400).send({ error: 'email_template_subject too long (max 200 chars)' });
      }
      if ('email_template_body' in updates && updates.email_template_body !== null && updates.email_template_body !== undefined && Buffer.byteLength(String(updates.email_template_body), 'utf8') > 51200) {
        return reply.status(400).send({ error: 'email_template_body too large (max 50KB)' });
      }
      if ('logo_url' in updates && updates.logo_url) {
        try {
          const u = new URL(updates.logo_url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            return reply.status(400).send({ error: 'Invalid logo_url', message: 'Must use http or https' });
          }
        } catch {
          return reply.status(400).send({ error: 'Invalid logo_url', message: 'Must be a valid URL' });
        }
      }
      for (const field of ['notify_email', 'notify_telegram', 'notify_slack', 'notify_discord', 'auto_reply_enabled', 'double_opt_in_enabled', 'file_uploads_enabled', 'active', 'email_template_enabled']) {
        if (field in updates) updates[field] = Boolean(updates[field]);
      }

      if (updates.redirect_url) {
        try {
          const u = new URL(updates.redirect_url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            return reply.status(400).send({ error: 'Invalid redirect_url', message: 'Redirect URL must use http or https' });
          }
        } catch {
          return reply.status(400).send({ error: 'Invalid redirect_url', message: 'Redirect URL must be a valid URL' });
        }
      }

      for (const [field, value] of [['webhook_url', updates.webhook_url], ['slack_webhook_url', updates.slack_webhook_url], ['discord_webhook_url', updates.discord_webhook_url]]) {
        if (!value) continue;
        const v = await validateWebhookUrl(value, { requireHttps: true });
        if (!v.valid) return reply.status(400).send({ error: `Invalid ${field}`, message: v.error });
      }

      updates.updated_at = new Date();

      const keys = Object.keys(updates);
      const setClauses = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
      const values = [formId, request.user.userId, ...Object.values(updates)];

      const [form] = await sql.unsafe(
        `UPDATE forms SET ${setClauses} WHERE id = $1 AND user_id = $2 RETURNING ${SAFE_FORM_COLS}`,
        values
      );

      if (!form) return reply.status(404).send({ error: 'Form not found' });
      return { form };
    } catch (err) {
      console.error('Error updating form:', err);
      return reply.status(500).send({ error: 'Failed to update form', message: INTERNAL_ERROR_MESSAGE });
    }
  });

  // DELETE /api/forms/:formId
  fastify.delete('/:formId', { preHandler: [fastify.auth, fastify.rateLimitSensitive] }, async (request, reply) => {
    try {
      const { formId } = request.params;
      const result = await sql`DELETE FROM forms WHERE id = ${formId} AND user_id = ${request.user.userId} RETURNING id`;
      if (!result.length) return reply.status(404).send({ error: 'Form not found' });
      return { success: true };
    } catch (err) {
      console.error('Error deleting form:', err);
      return reply.status(500).send({ error: 'Failed to delete form', message: INTERNAL_ERROR_MESSAGE });
    }
  });

  // PATCH /api/forms/:formId/toggle
  fastify.patch('/:formId/toggle', { preHandler: fastify.auth }, async (request, reply) => {
    try {
      const { formId } = request.params;
      const [form] = await sql`
        UPDATE forms SET active = NOT active, updated_at = NOW()
        WHERE id = ${formId} AND user_id = ${request.user.userId}
        RETURNING id, active
      `;
      if (!form) return reply.status(404).send({ error: 'Form not found' });
      return { form };
    } catch (err) {
      console.error('Error toggling form:', err);
      return reply.status(500).send({ error: 'Failed to toggle form', message: INTERNAL_ERROR_MESSAGE });
    }
  });

  // POST /api/forms/:formId/test-email
  fastify.post('/:formId/test-email', {
    preHandler: [fastify.auth, fastify.rateLimitSensitive]
  }, async (request, reply) => {
    try {
      const { formId } = request.params;
      const { email } = request.body || {};

      if (!email || !validator.isEmail(email)) {
        return reply.status(400).send({ error: 'Invalid email address' });
      }

      const [form] = await sql.unsafe(
        `SELECT id, name, email_template_enabled, email_template_subject, email_template_body, logo_url FROM forms WHERE id = $1 AND user_id = $2`,
        [formId, request.user.userId]
      );
      if (!form) return reply.status(404).send({ error: 'Form not found' });

      const [owner] = await sql`SELECT smtp_config FROM users WHERE id = ${request.user.userId}`;
      const smtpConfig = owner?.smtp_config || null;

      const sampleData = {
        name: 'John Doe', email: 'john@example.com',
        message: 'This is a sample form submission.',
        phone: '+1 (555) 123-4567'
      };

      let validatedLogoUrl = '';
      if (form.logo_url) {
        try {
          const u = new URL(form.logo_url);
          if (u.protocol === 'http:' || u.protocol === 'https:') validatedLogoUrl = form.logo_url;
        } catch {}
      }

      const vars = {
        form_name: form.name,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        datetime: new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        logo: validatedLogoUrl,
        ...sampleData
      };

      let subject, htmlBody;
      if (form.email_template_enabled && form.email_template_body) {
        subject = replaceVariables(form.email_template_subject || 'New submission from {{form_name}}', vars);
        let tmpl = sanitizeTemplate(form.email_template_body);
        tmpl = validatedLogoUrl
          ? tmpl.replace(/\{\{#if logo\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
          : tmpl.replace(/\{\{#if logo\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        htmlBody = replaceVariables(tmpl, vars);
      } else {
        subject = `New submission from ${form.name}`;
        htmlBody = generateDefaultEmailTemplate(form.name, sampleData);
      }

      await emailHelpers.sendEmail({
        smtpConfig,
        to: email,
        subject: `[TEST] ${subject}`,
        html: `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px;margin-bottom:20px;border-radius:4px;"><strong>⚠️ This is a test email</strong></div>${htmlBody}`
      });

      return { success: true };
    } catch (err) {
      console.error('Test email error:', err);
      return reply.status(500).send({ error: 'Failed to send test email', message: INTERNAL_ERROR_MESSAGE });
    }
  });
}
