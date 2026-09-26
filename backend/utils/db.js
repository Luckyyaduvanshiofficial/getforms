// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_POSTGRES = Boolean(process.env.DATABASE_URL && process.env.DB_CLIENT === 'postgres');
let sql;
let sqliteDb = null;

// JSON columns that should be parsed automatically from SQLite
const JSON_COLUMNS = new Set([
  'data', 'metadata', 'file_urls', 'tags', 'blocklist',
  'notification_emails', 'email_config', 'smtp_config',
  'allowed_domains', 'allowed_file_types', 'payload'
]);

function parseRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const [key, val] of Object.entries(out)) {
    if (JSON_COLUMNS.has(key) && typeof val === 'string') {
      try {
        out[key] = JSON.parse(val);
      } catch {}
    }
    // Convert SQLite 0/1 to boolean for known boolean columns
    if (['active', 'archived', 'notify_email', 'notify_telegram', 'notify_slack', 'notify_discord',
         'email_template_enabled', 'auto_reply_enabled', 'double_opt_in_enabled', 'file_uploads_enabled',
         'is_confirmed'].includes(key) && typeof val === 'number') {
      out[key] = Boolean(val);
    }
  }
  return out;
}

if (!IS_POSTGRES) {
  // ─── SQLite Mode (Default & Zero Setup) ──────────────────────────────────────
  const dataDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'getform.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('synchronous = NORMAL');
  sqliteDb.pragma('foreign_keys = ON');

  // Register custom SQLite functions matching PostgreSQL built-ins
  sqliteDb.function('gen_random_uuid', () => crypto.randomUUID());
  sqliteDb.function('now', () => new Date().toISOString());
  sqliteDb.function('date_trunc', (unit, d) => {
    const date = d ? new Date(d) : new Date();
    if (unit === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    if (unit === 'week') {
      const diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
      return new Date(date.setDate(diff)).toISOString();
    }
    if (unit === 'month') {
      return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    }
    return date.toISOString();
  });

  // Initialize SQLite schema
  initSqliteSchema(sqliteDb);

  // Tagged template function for SQLite
  sql = async function(strings, ...values) {
    let query = '';
    const params = [];
    for (let i = 0; i < strings.length; i++) {
      query += strings[i];
      if (i < values.length) {
        let val = values[i];
        if (val && typeof val === 'object' && val.__isSqlJson) {
          params.push(JSON.stringify(val.val));
        } else if (val && typeof val === 'object' && !(val instanceof Date)) {
          params.push(JSON.stringify(val));
        } else if (val instanceof Date) {
          params.push(val.toISOString());
        } else if (typeof val === 'boolean') {
          params.push(val ? 1 : 0);
        } else {
          params.push(val);
        }
        query += '?';
      }
    }
    return executeSqlite(query.trim(), params);
  };

  sql.unsafe = async function(query, params = []) {
    // Map $N positional parameters in the exact order they appear in the query
    const reorderedParams = [];
    const converted = query.replace(/\$(\d+)/g, (match, indexStr) => {
      const idx = parseInt(indexStr, 10) - 1;
      let val = params[idx];
      if (val && typeof val === 'object' && !(val instanceof Date)) {
        val = JSON.stringify(val);
      } else if (val instanceof Date) {
        val = val.toISOString();
      } else if (typeof val === 'boolean') {
        val = val ? 1 : 0;
      }
      reorderedParams.push(val !== undefined ? val : null);
      return '?';
    });

    return executeSqlite(converted, reorderedParams);
  };

  sql.json = function(val) {
    return { __isSqlJson: true, val };
  };

  sql.end = async function() {
    if (sqliteDb) sqliteDb.close();
  };

} else {
  // ─── PostgreSQL Mode ────────────────────────────────────────────────────────
  const postgres = (await import('postgres')).default;
  const DATABASE_URL = process.env.DATABASE_URL;
  sql = postgres(DATABASE_URL, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {}
  });
}

function executeSqlite(rawQuery, params) {
  // Strip Postgres typecasts like ::int, ::text, ::jsonb
  let query = rawQuery.replace(/::[a-zA-Z_]+/g, '');
  // Map Postgres NOW() - INTERVAL '1 day' to SQLite datetime('now', '-1 day')
  query = query.replace(/NOW\(\)\s*-\s*INTERVAL\s*'([^']+)'/gi, "datetime('now', '-$1')");
  const isSelect = /^\s*SELECT/i.test(query);
  const isReturning = /RETURNING/i.test(query);

  try {
    const stmt = sqliteDb.prepare(query);
    if (isSelect || isReturning) {
      const rows = stmt.all(...params);
      return rows.map(parseRow);
    } else {
      const res = stmt.run(...params);
      return res;
    }
  } catch (err) {
    console.error(`[SQLite Error] ${err.message} in query: ${query}`);
    throw err;
  }
}

function initSqliteSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      notify_email TEXT,
      telegram_bot_token TEXT,
      telegram_chat_id TEXT,
      slack_webhook_url TEXT,
      smtp_config TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      endpoint TEXT UNIQUE NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      notification_email TEXT,
      notification_emails TEXT NOT NULL DEFAULT '[]',
      notification_type TEXT NOT NULL DEFAULT 'instant',
      email_config TEXT,
      email_template_enabled INTEGER NOT NULL DEFAULT 0,
      email_template_subject TEXT,
      email_template_body TEXT,
      logo_url TEXT,
      webhook_url TEXT,
      slack_webhook_url TEXT,
      discord_webhook_url TEXT,
      webhook_secret TEXT,
      redirect_url TEXT,
      allowed_domains TEXT NOT NULL DEFAULT '["*"]',
      blocklist TEXT NOT NULL DEFAULT '[]',
      close_after_submissions INTEGER,
      close_at TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      notify_email INTEGER NOT NULL DEFAULT 0,
      notify_telegram INTEGER NOT NULL DEFAULT 0,
      notify_slack INTEGER NOT NULL DEFAULT 0,
      notify_discord INTEGER NOT NULL DEFAULT 0,
      auto_reply_enabled INTEGER NOT NULL DEFAULT 0,
      auto_reply_subject TEXT,
      auto_reply_body TEXT,
      double_opt_in_enabled INTEGER NOT NULL DEFAULT 0,
      confirmation_redirect_url TEXT,
      spam_engine TEXT NOT NULL DEFAULT 'honeypot',
      turnstile_secret_key TEXT,
      recaptcha_secret_key TEXT,
      altcha_secret_key TEXT,
      file_uploads_enabled INTEGER NOT NULL DEFAULT 0,
      max_file_size_mb INTEGER NOT NULL DEFAULT 10,
      allowed_file_types TEXT NOT NULL DEFAULT '[]',
      submission_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      form_endpoint TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      metadata TEXT NOT NULL DEFAULT '{}',
      file_urls TEXT NOT NULL DEFAULT '[]',
      archived INTEGER NOT NULL DEFAULT 0,
      read_at TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      is_confirmed INTEGER NOT NULL DEFAULT 1,
      confirmation_token TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS delivery_queue (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      form_id TEXT NOT NULL,
      job_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      next_run_at TEXT DEFAULT (datetime('now')),
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_retry_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_forms_endpoint ON forms(endpoint);
    CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_queue_status_run ON delivery_queue(status, next_run_at);
  `);

  try {
    db.exec(`ALTER TABLE delivery_queue ADD COLUMN updated_at TEXT`);
  } catch {}

  // Ensure default admin user exists for immediate out-of-the-box usage
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(crypto.randomUUID(), 'admin', 'admin@getform.local', hash, 'Administrator');
    console.log('✓ Initialized default user: admin (admin@getform.local / admin123)');
  }
}

export default sql;

// ─── High-Level DB Helpers ────────────────────────────────────────────────────

export const dbHelpers = {
  async getFormByEndpoint(endpoint) {
    const [form] = await sql`
      SELECT f.*,
             u.id                 AS owner_uuid,
             u.notify_email       AS owner_notify_email,
             u.telegram_bot_token AS owner_telegram_bot_token,
             u.telegram_chat_id   AS owner_telegram_chat_id,
             u.smtp_config        AS owner_smtp_config,
             u.slack_webhook_url  AS owner_slack_webhook_url
      FROM forms f
      JOIN users u ON u.id = f.user_id
      WHERE f.endpoint = ${endpoint}
      LIMIT 1
    `;
    return form || null;
  },

  async saveSubmission(formId, formEndpoint, data, metadata, isConfirmed = true, confirmationToken = null) {
    const id = crypto.randomUUID();
    const [submission] = await sql`
      INSERT INTO submissions (id, form_id, form_endpoint, data, metadata, is_confirmed, confirmation_token)
      VALUES (${id}, ${formId}, ${formEndpoint}, ${sql.json(data)}, ${sql.json(metadata)}, ${isConfirmed}, ${confirmationToken})
      RETURNING *
    `;
    await sql`
      UPDATE forms
      SET submission_count = COALESCE(submission_count, 0) + 1,
          updated_at = datetime('now')
      WHERE id = ${formId}
    `;
    return submission;
  },

  async saveSubmissionWithFiles(formId, formEndpoint, data, fileUrls, metadata, isConfirmed = true, confirmationToken = null) {
    const id = crypto.randomUUID();
    const [submission] = await sql`
      INSERT INTO submissions (id, form_id, form_endpoint, data, file_urls, metadata, is_confirmed, confirmation_token)
      VALUES (${id}, ${formId}, ${formEndpoint}, ${sql.json(data)}, ${sql.json(fileUrls)}, ${sql.json(metadata)}, ${isConfirmed}, ${confirmationToken})
      RETURNING *
    `;
    await sql`
      UPDATE forms
      SET submission_count = COALESCE(submission_count, 0) + 1,
          updated_at = datetime('now')
      WHERE id = ${formId}
    `;
    return submission;
  },

  async confirmSubmission(endpoint, token) {
    const [submission] = await sql`
      UPDATE submissions
      SET is_confirmed = true, confirmation_token = NULL
      WHERE form_endpoint = ${endpoint} AND confirmation_token = ${token}
      RETURNING *
    `;
    return submission || null;
  },

  async enqueueJob(submissionId, formId, jobType, payload) {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO delivery_queue (id, submission_id, form_id, job_type, payload, status, next_run_at)
      VALUES (${id}, ${submissionId}, ${formId}, ${jobType}, ${sql.json(payload)}, 'pending', datetime('now'))
    `;
  }
};
