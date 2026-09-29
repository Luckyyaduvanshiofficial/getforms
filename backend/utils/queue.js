// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import sql from './db.js';
import crypto from 'crypto';
import { emailHelpers, replaceVariables } from './mailer.js';
import { sendTelegramNotification } from './telegram.js';
import { sendSlackNotification } from './slack.js';
import { sendDiscordNotification } from './discord.js';
import { deliverWebhook } from './webhookHttp.js';
import nodemailer from 'nodemailer';

let workerRunning = false;
let workerInterval = null;

/**
 * Enqueue a delivery job into the persistent queue
 */
export async function enqueueDeliveryJob({ submissionId, formId, jobType, payload }) {
  const id = crypto.randomUUID();
  try {
    await sql`
      INSERT INTO delivery_queue (id, submission_id, form_id, job_type, payload, status, next_run_at)
      VALUES (${id}, ${submissionId}, ${formId}, ${jobType}, ${sql.json(payload)}, 'pending', NOW())
    `;
    // Trigger immediate execution
    setImmediate(processQueueBatch);
  } catch (err) {
    console.error(`[Queue] Failed to enqueue job ${jobType}:`, err.message);
  }
}

/**
 * Start the background queue worker
 */
export function startQueueWorker() {
  if (workerInterval) return;
  console.log('✓ Starting background delivery queue worker...');
  workerInterval = setInterval(processQueueBatch, 5000);
  setImmediate(processQueueBatch);
}

/**
 * Stop queue worker
 */
export function stopQueueWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

/**
 * Process a batch of pending jobs
 */
async function processQueueBatch() {
  if (workerRunning) return;
  workerRunning = true;

  try {
    const jobs = await sql`
      SELECT * FROM delivery_queue
      WHERE status IN ('pending', 'retry')
        AND next_run_at <= ${new Date().toISOString()}
      ORDER BY created_at ASC
      LIMIT 10
    `;

    for (const job of jobs) {
      await processSingleJob(job);
    }
  } catch (err) {
    console.error('[Queue Worker] Batch processing error:', err.message);
  } finally {
    workerRunning = false;
  }
}

async function processSingleJob(job) {
  const { id, job_type, payload, attempts, max_attempts, form_id } = job;
  const currentAttempt = (attempts || 0) + 1;

  try {
    switch (job_type) {
      case 'email':
        await handleEmailNotification(payload);
        break;

      case 'auto_reply':
        await handleAutoReply(payload);
        break;

      case 'double_opt_in':
        await handleDoubleOptIn(payload);
        break;

      case 'telegram':
        await sendTelegramNotification(payload.token, payload.chatId, {
          formName: payload.formName,
          submissionData: payload.submissionData
        });
        break;

      case 'discord':
        await sendDiscordNotification(payload.webhookUrl, {
          formName: payload.formName,
          endpoint: payload.endpoint,
          submissionData: payload.submissionData,
          metadata: payload.metadata
        });
        break;

      case 'slack':
        await sendSlackNotification(payload.webhookUrl, {
          formName: payload.formName,
          submissionData: payload.submissionData
        });
        break;

      case 'webhook':
        await deliverWebhook(payload.form, payload.submissionData, payload.metadata);
        break;

      default:
        console.warn(`[Queue] Unknown job type: ${job_type}`);
    }

    // Mark job as completed
    await sql`
      UPDATE delivery_queue
      SET status = 'completed', updated_at = NOW()
      WHERE id = ${id}
    `;

    console.log(`✓ [Queue] Successfully processed job ${job_type} (${id})`);

  } catch (err) {
    console.error(`❌ [Queue] Failed job ${job_type} (attempt ${currentAttempt}/${max_attempts}):`, err.message);

    if (currentAttempt >= max_attempts) {
      // Mark failed
      await sql`
        UPDATE delivery_queue
        SET status = 'failed',
            attempts = ${currentAttempt},
            error_message = ${err.message},
            updated_at = NOW()
        WHERE id = ${id}
      `;

      // Log in webhook_logs
      try {
        await sql`
          INSERT INTO webhook_logs (id, form_id, payload, status, retry_count, last_retry_at)
          VALUES (${crypto.randomUUID()}, ${form_id}, ${sql.json({ job_type, error: err.message })}, 'failed', ${currentAttempt}, NOW())
        `;
      } catch {}

    } else {
      // Exponential backoff: 5s, 15s, 45s, 120s...
      const delaySec = Math.pow(3, currentAttempt) * 5;
      const nextRun = new Date(Date.now() + delaySec * 1000).toISOString();

      await sql`
        UPDATE delivery_queue
        SET status = 'retry',
            attempts = ${currentAttempt},
            next_run_at = ${nextRun},
            error_message = ${err.message},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    }
  }
}

/**
 * Handle form owner email notification
 */
async function handleEmailNotification(payload) {
  const { form, submissionData, fileUrls } = payload;
  await emailHelpers.sendSubmissionNotification(form, submissionData, fileUrls);
}

/**
 * Handle auto-reply thank-you email to submitter
 */
async function handleAutoReply(payload) {
  const { form, submitterEmail, submissionData } = payload;
  if (!submitterEmail) return;

  const subject = replaceVariables(form.auto_reply_subject || 'Thank you for contacting us', submissionData);
  const defaultBody = `<p>Hi there,</p><p>Thank you for reaching out! We received your submission for <strong>${form.name || form.endpoint}</strong> and will get back to you shortly.</p>`;
  const bodyHtml = form.auto_reply_body ? replaceVariables(form.auto_reply_body, submissionData) : defaultBody;

  // Use form SMTP if configured, else owner SMTP, else global SMTP
  const smtpConfig = form.email_config || form.owner_smtp_config || {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL || 'GetForms <noreply@example.com>'
  };

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: (smtpConfig.user && smtpConfig.pass) ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined
  });

  await transporter.sendMail({
    from: smtpConfig.from || process.env.FROM_EMAIL || 'noreply@example.com',
    to: submitterEmail,
    subject,
    html: bodyHtml
  });
}

/**
 * Handle double opt-in verification email for newsletters
 */
async function handleDoubleOptIn(payload) {
  const { form, submitterEmail, confirmUrl } = payload;
  if (!submitterEmail || !confirmUrl) return;

  const smtpConfig = form.email_config || form.owner_smtp_config || {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL || 'GetForms <noreply@example.com>'
  };

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: (smtpConfig.user && smtpConfig.pass) ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined
  });

  const subject = `Please confirm your subscription to ${form.name || form.endpoint}`;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#111827;margin-top:0;">Confirm your subscription</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.5;">
        You're almost there! Click the button below to confirm your subscription to <strong>${form.name || form.endpoint}</strong>.
      </p>
      <div style="margin:28px 0;text-align:center;">
        <a href="${confirmUrl}" style="background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">
          Confirm Subscription
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: smtpConfig.from || process.env.FROM_EMAIL || 'noreply@example.com',
    to: submitterEmail,
    subject,
    html
  });
}
