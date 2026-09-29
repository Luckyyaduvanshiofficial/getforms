// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import crypto from 'crypto';
import path from 'path';
import escapeHtml from 'escape-html';
import sql, { dbHelpers } from '../utils/db.js';
import { getRequestIp } from '../middleware/rateLimit.js';
import { validateSubmissionData } from '../utils/validation.js';
import { enqueueDeliveryJob } from '../utils/queue.js';
import { evaluateHoneypot, verifyTurnstile, verifyRecaptcha, verifyAltcha, isAllowedOrigin } from '../utils/spam.js';
import { saveUploadedFile, isAllowedMimeType } from '../utils/storage.js';
import { broadcastSubmission } from './forms.js';

function isBlockedByList(blocklist = [], data = {}, ip = '') {
  if (!Array.isArray(blocklist)) return false;
  for (const entry of blocklist) {
    if (!entry?.type || !entry?.value) continue;
    const v = String(entry.value).toLowerCase().trim();
    if (entry.type === 'ip' && ip === v) return true;
    if (entry.type === 'email') {
      const emailVal = Object.values(data).find(val => String(val).toLowerCase().trim() === v);
      if (emailVal) return true;
    }
    if (entry.type === 'domain') {
      const domainMatch = Object.values(data).some(val => {
        const s = String(val).toLowerCase().trim();
        return s.endsWith(`@${v}`) || s === v;
      });
      if (domainMatch) return true;
    }
    if (entry.type === 'keyword') {
      const keywordMatch = Object.values(data).some(val => {
        return String(val).toLowerCase().includes(v);
      });
      if (keywordMatch) return true;
    }
  }
  return false;
}

// ─── Hosted form renderer ──────────────────────────────────────────────────────

function renderHostedForm(form, req) {
  const formName   = escapeHtml(form.name || 'Contact Form');
  const endpoint   = escapeHtml(form.endpoint);
  const description = form.description ? `<p style="color:#6b7280;margin:0 0 20px;font-size:14px;line-height:1.5;">${escapeHtml(form.description)}</p>` : '';

  const fields = Array.isArray(form.fields) && form.fields.length > 0
    ? form.fields
    : [
        { name: 'name', label: 'Your Name', type: 'text', required: true },
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: false }
      ];

  const fieldsHtml = fields.map(f => {
    const label = `<label for="${escapeHtml(f.name)}" style="display:block;margin-bottom:6px;font-weight:500;font-size:14px;color:#374151;">${escapeHtml(f.label)}${f.required ? ' <span style="color:#ef4444">*</span>' : ''}</label>`;
    let input = '';
    const base = `id="${escapeHtml(f.name)}" name="${escapeHtml(f.name)}"${f.required ? ' required' : ''} style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color 0.2s;" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'"`;

    if (f.type === 'textarea') {
      input = `<textarea ${base} rows="4"></textarea>`;
    } else if (f.type === 'select') {
      const options = (f.options || []).map(o => `<option value="${escapeHtml(String(o.value))}">${escapeHtml(String(o.label))}</option>`).join('');
      input = `<select ${base}><option value="">Select...</option>${options}</select>`;
    } else if (f.type === 'checkbox') {
      input = `<input type="checkbox" id="${escapeHtml(f.name)}" name="${escapeHtml(f.name)}" value="${escapeHtml(String(f.value || 'on'))}"${f.required ? ' required' : ''} style="margin-right:8px;">`;
    } else {
      input = `<input type="${escapeHtml(f.type)}" ${base}>`;
    }
    return `<div style="margin-bottom:18px;">${label}${input}</div>`;
  }).join('');

  const fileUploadHtml = form.file_uploads_enabled
    ? `<div style="margin-bottom:18px;">
        <label for="attachment" style="display:block;margin-bottom:6px;font-weight:500;font-size:14px;color:#374151;">Attachment</label>
        <input type="file" id="attachment" name="attachment" style="width:100%;font-size:14px;color:#4b5563;">
        <small style="color:#9ca3af;font-size:12px;">Max size: ${form.max_file_size_mb || 10}MB</small>
       </div>`
    : '';

  const turnstileScript = form.spam_engine === 'turnstile' && form.turnstile_secret_key
    ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
       <div class="cf-turnstile" data-sitekey="${escapeHtml(form.turnstile_site_key || '1x00000000000000000000AA')}" style="margin-bottom:18px;"></div>`
    : '';

  const redirectScript = form.redirect_url
    ? `window.location.href = ${JSON.stringify(form.redirect_url)};`
    : `document.getElementById('getforms-container').innerHTML = '<div style="text-align:center;padding:24px 0;"><div style="width:48px;height:48px;background:#dcfce7;color:#16a34a;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;">✓</div><h3 style="margin:0 0 8px;font-size:18px;color:#111827;">Thank You!</h3><p style="color:#6b7280;margin:0;font-size:14px;">Your submission has been received.</p></div>';`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${formName} — GetForms</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px 16px;box-sizing:border-box;}
  .card{background:#ffffff;padding:36px;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05),0 8px 10px -6px rgba(0,0,0,0.01);width:100%;max-width:500px;box-sizing:border-box;}
</style>
</head>
<body>
<div class="card">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
    ${form.logo_url ? `<img src="${escapeHtml(form.logo_url)}" alt="Logo" style="height:36px;width:auto;border-radius:6px;object-fit:contain;">` : ''}
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0;">${formName}</h1>
  </div>
  ${description}
  <div id="getforms-container">
    <form id="getforms-form" method="POST" action="/f/${endpoint}" ${form.file_uploads_enabled ? 'enctype="multipart/form-data"' : ''}>
      ${fieldsHtml}
      ${fileUploadHtml}
      ${turnstileScript}
      <!-- Invisible Honeypot field for bot trapping -->
      <div style="display:none;position:absolute;left:-9999px;" aria-hidden="true">
        <input type="text" name="website" tabindex="-1" autocomplete="off">
        <input type="text" name="_gotcha" tabindex="-1" autocomplete="off">
      </div>
      <button type="submit" style="width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
        Submit
      </button>
    </form>
  </div>
  <div style="margin-top:24px;text-align:center;">
    <a href="https://github.com/Luckyyaduvanshiofficial/getforms" target="_blank" style="color:#9ca3af;font-size:12px;text-decoration:none;">Powered by <strong>GetForms Open Source</strong></a>
  </div>
</div>
<script>
document.getElementById('getforms-form').addEventListener('submit', async function(e) {
  // If file upload is present, allow standard form submission or handle via fetch FormData
  e.preventDefault();
  const btn = this.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Submitting…';
  const formData = new FormData(this);
  formData.append('_getforms_js', '1');

  try {
    const res = await fetch('/f/${endpoint}', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      ${redirectScript}
    } else {
      const err = await res.json().catch(() => ({}));
      btn.disabled = false; btn.textContent = 'Submit';
      alert(err.message || 'Submission failed. Please try again.');
    }
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Submit';
    alert('Network error. Please try again.');
  }
});
</script>
</body>
</html>`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function publicRoutes(fastify) {
  // GET /f/:endpoint — render hosted form
  fastify.get('/f/:endpoint', async (request, reply) => {
    const { endpoint } = request.params;
    const form = await dbHelpers.getFormByEndpoint(endpoint);

    if (!form) return reply.status(404).send({ error: 'Form not found' });
    if (!form.active) {
      return reply.status(200).type('text/html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f9fafb;"><div style="max-width:480px;margin:0 auto;background:#fff;padding:36px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);"><h2>This form is no longer accepting submissions.</h2><p style="color:#6b7280;">Please contact the site administrator.</p></div></body></html>`);
    }

    if (form.close_at && new Date(form.close_at) < new Date()) {
      return reply.status(200).type('text/html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f9fafb;"><div style="max-width:480px;margin:0 auto;background:#fff;padding:36px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);"><h2>This form is closed.</h2><p style="color:#6b7280;">Submission deadline has passed.</p></div></body></html>`);
    }

    return reply.type('text/html').send(renderHostedForm(form, request));
  });

  // GET /f/:endpoint/confirm/:token — newsletter double opt-in confirmation
  fastify.get('/f/:endpoint/confirm/:token', async (request, reply) => {
    const { endpoint, token } = request.params;
    const form = await dbHelpers.getFormByEndpoint(endpoint);
    if (!form) return reply.status(404).send({ error: 'Form not found' });

    const submission = await dbHelpers.confirmSubmission(endpoint, token);
    if (!submission) {
      return reply.status(400).type('text/html').send(`
        <!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f9fafb;">
          <div style="max-width:480px;margin:0 auto;background:#fff;padding:36px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color:#ef4444;">Invalid or Expired Link</h2>
            <p style="color:#6b7280;">This confirmation link is invalid or has already been used.</p>
          </div>
        </body></html>
      `);
    }

    // Now dispatch notification to form owner since the email is confirmed!
    if (form.notify_email && (form.notification_email || form.owner_notify_email)) {
      await enqueueDeliveryJob({
        submissionId: submission.id,
        formId: form.id,
        jobType: 'email',
        payload: {
          form,
          submissionData: submission.data,
          fileUrls: submission.file_urls
        }
      });
    }

    if (form.confirmation_redirect_url) {
      return reply.redirect(302, form.confirmation_redirect_url);
    }

    return reply.type('text/html').send(`
      <!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f9fafb;">
        <div style="max-width:480px;margin:0 auto;background:#fff;padding:36px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="width:48px;height:48px;background:#dcfce7;color:#16a34a;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;">✓</div>
          <h2 style="color:#111827;margin:0 0 10px;">Subscription Confirmed!</h2>
          <p style="color:#4b5563;">Thank you for confirming your email for <strong>${escapeHtml(form.name || form.endpoint)}</strong>.</p>
        </div>
      </body></html>
    `);
  });

  // POST /f/:endpoint — receive submission
  fastify.post('/f/:endpoint', {
    preHandler: [fastify.rateLimitFormSubmission]
  }, async (request, reply) => {
    const { endpoint } = request.params;
    const ip = getRequestIp(request);
    const origin = request.headers.origin || '';
    const referer = request.headers.referer || request.headers.referrer || '';

    try {
      const form = await dbHelpers.getFormByEndpoint(endpoint);

      if (!form) {
        return reply.status(404).send({ error: 'Form not found', message: 'No form found with this endpoint' });
      }

      if (!form.active) {
        return reply.status(422).send({ error: 'Form inactive', message: 'This form is not currently accepting submissions' });
      }

      if (form.close_at && new Date(form.close_at) < new Date()) {
        return reply.status(422).send({ error: 'Form closed', message: 'This form is no longer accepting submissions' });
      }

      // Check submission limit
      if (form.close_after_submissions && form.submission_count >= form.close_after_submissions) {
        return reply.status(422).send({ error: 'Form closed', message: 'This form has reached its submission limit' });
      }

      // Verify Domain / CORS Whitelist
      if (!isAllowedOrigin(form.allowed_domains, origin, referer)) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Submissions not permitted from this domain' });
      }

      let rawData = {};
      const fileUrls = [];

      // Check Content-Type for multipart or JSON/url-encoded
      if (request.isMultipart()) {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.file) {
            if (form.file_uploads_enabled) {
              const buffer = await part.toBuffer();
              const maxBytes = (Number(form.max_file_size_mb) || 10) * 1024 * 1024;
              if (buffer.length > maxBytes) {
                return reply.status(413).send({ error: 'File too large', message: `Max file size is ${form.max_file_size_mb || 10}MB` });
              }
              if (isAllowedMimeType(part.mimetype, form.allowed_file_types)) {
                const saved = await saveUploadedFile({
                  buffer,
                  originalName: part.filename,
                  mimeType: part.mimetype
                });
                fileUrls.push(saved.publicUrl);
              }
            }
          } else {
            rawData[part.fieldname] = part.value;
          }
        }
      } else {
        rawData = request.body || {};
        if (typeof rawData === 'string') {
          try { rawData = JSON.parse(rawData); } catch { rawData = {}; }
        }
      }

      // 1. Honeypot check
      const { isSpam: isHoneypotSpam, cleanData } = evaluateHoneypot(rawData);
      delete cleanData._getforms_js;
      delete cleanData._formto_js;
      delete cleanData._js;

      if (isHoneypotSpam) {
        // Silent accept to fool bots
        console.warn(`[Spam Trap] Honeypot triggered for form ${endpoint} from IP ${ip}`);
        return reply.status(200).send({ success: true });
      }

      // 2. Modern Captcha checks (Turnstile / reCAPTCHA / Altcha)
      if (form.spam_engine === 'turnstile' && form.turnstile_secret_key) {
        const token = cleanData['cf-turnstile-response'];
        delete cleanData['cf-turnstile-response'];
        const valid = await verifyTurnstile(token, form.turnstile_secret_key, ip);
        if (!valid) {
          return reply.status(400).send({ error: 'Spam check failed', message: 'Invalid Turnstile captcha' });
        }
      } else if (form.spam_engine === 'recaptcha' && form.recaptcha_secret_key) {
        const token = cleanData['g-recaptcha-response'];
        delete cleanData['g-recaptcha-response'];
        const valid = await verifyRecaptcha(token, form.recaptcha_secret_key, ip);
        if (!valid) {
          return reply.status(400).send({ error: 'Spam check failed', message: 'Invalid reCAPTCHA' });
        }
      } else if (form.spam_engine === 'altcha' && form.altcha_secret_key) {
        const token = cleanData['altcha'];
        delete cleanData['altcha'];
        const valid = verifyAltcha(token, form.altcha_secret_key);
        if (!valid) {
          return reply.status(400).send({ error: 'Spam check failed', message: 'Invalid Altcha proof-of-work' });
        }
      }

      // 3. Validation & Blocklist check
      const dataValidation = validateSubmissionData(cleanData);
      if (!dataValidation.valid) {
        return reply.status(400).send({ error: 'Invalid submission', message: dataValidation.error });
      }

      if (isBlockedByList(form.blocklist, cleanData, ip)) {
        console.warn(`[Blocklist] Submission blocked on form ${endpoint} from IP ${ip}`);
        return reply.status(200).send({ success: true });
      }

      // Build metadata
      const metadata = {
        ip,
        userAgent: request.headers['user-agent'] || '',
        referer,
        timestamp: new Date().toISOString()
      };

      // 4. Double Opt-In Handling
      const isDoubleOptIn = Boolean(form.double_opt_in_enabled);
      const confirmationToken = isDoubleOptIn ? crypto.randomBytes(24).toString('hex') : null;
      const isConfirmed = !isDoubleOptIn;

      // 5. Save submission to Database
      const submission = fileUrls.length > 0
        ? await dbHelpers.saveSubmissionWithFiles(form.id, endpoint, cleanData, fileUrls, metadata, isConfirmed, confirmationToken)
        : await dbHelpers.saveSubmission(form.id, endpoint, cleanData, metadata, isConfirmed, confirmationToken);

      // Broadcast real-time SSE event to dashboard
      broadcastSubmission(form.id, submission);

      const formName = form.name || form.endpoint;
      const submitterEmail = Object.entries(cleanData).find(([k]) => /email/i.test(k))?.[1];

      // 6. Handle Double Opt-In Email or Standard Notifications
      if (isDoubleOptIn && submitterEmail) {
        const baseUrl = process.env.BASE_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : 'http://localhost:3001');
        const confirmUrl = `${baseUrl}/f/${endpoint}/confirm/${confirmationToken}`;

        await enqueueDeliveryJob({
          submissionId: submission.id,
          formId: form.id,
          jobType: 'double_opt_in',
          payload: { form, submitterEmail, confirmUrl }
        });

      } else {
        // Enqueue async notifications
        const emailRecipient = form.notification_email || form.owner_notify_email;
        if (form.notify_email && emailRecipient) {
          await enqueueDeliveryJob({
            submissionId: submission.id,
            formId: form.id,
            jobType: 'email',
            payload: {
              form: { ...form, notification_emails: [emailRecipient], _smtpConfig: form.owner_smtp_config },
              submissionData: cleanData,
              fileUrls
            }
          });
        }

        // Auto-responder thank you email to submitter
        if (form.auto_reply_enabled && submitterEmail) {
          await enqueueDeliveryJob({
            submissionId: submission.id,
            formId: form.id,
            jobType: 'auto_reply',
            payload: { form, submitterEmail, submissionData: cleanData }
          });
        }

        // Telegram
        if (form.notify_telegram && form.owner_telegram_bot_token && form.owner_telegram_chat_id) {
          await enqueueDeliveryJob({
            submissionId: submission.id,
            formId: form.id,
            jobType: 'telegram',
            payload: {
              token: form.owner_telegram_bot_token,
              chatId: form.owner_telegram_chat_id,
              formName,
              submissionData: cleanData
            }
          });
        }

        // Discord
        if (form.notify_discord && form.discord_webhook_url) {
          await enqueueDeliveryJob({
            submissionId: submission.id,
            formId: form.id,
            jobType: 'discord',
            payload: {
              webhookUrl: form.discord_webhook_url,
              formName,
              endpoint,
              submissionData: cleanData,
              metadata
            }
          });
        }

        // Slack
        if (form.notify_slack && form.owner_slack_webhook_url) {
          await enqueueDeliveryJob({
            submissionId: submission.id,
            formId: form.id,
            jobType: 'slack',
            payload: {
              webhookUrl: form.owner_slack_webhook_url,
              formName,
              submissionData: cleanData
            }
          });
        }

        // Generic Webhook
        if (form.webhook_url) {
          await enqueueDeliveryJob({
            submissionId: submission.id,
            formId: form.id,
            jobType: 'webhook',
            payload: { form, submissionData: cleanData, metadata }
          });
        }
      }

      // Return redirect or JSON
      const isJsSubmission = request.body?._getforms_js || request.body?._formto_js || request.body?._js;
      const acceptsHtml = String(request.headers.accept || '').includes('text/html');
      if (form.redirect_url && (acceptsHtml || !isJsSubmission)) {
        return reply.redirect(302, form.redirect_url);
      }

      return reply.status(200).send({
        success: true,
        submissionId: submission.id,
        message: isDoubleOptIn ? 'Please check your email to confirm your submission.' : 'Submission received successfully'
      });

    } catch (err) {
      console.error('Public submission error:', err);
      return reply.status(500).send({ error: 'Internal server error', message: 'Please try again later' });
    }
  });
}
