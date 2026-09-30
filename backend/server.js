// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');

import { authMiddleware } from './middleware/auth.js';
import { getRequestIp, rateLimitPresets } from './middleware/rateLimit.js';

import authRoutes       from './routes/auth.js';
import formRoutes       from './routes/forms.js';
import submissionRoutes from './routes/submissions.js';
import publicRoutes     from './routes/public.js';
import webhookRoutes    from './routes/webhooks.js';

import sql from './utils/db.js';
import { UPLOADS_DIR } from './utils/storage.js';
import { startQueueWorker, stopQueueWorker } from './utils/queue.js';

dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } }
    })
  },
  trustProxy: process.env.NODE_ENV === 'production'
    ? ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
    : false,
  bodyLimit: 524288,     // 512KB
  requestTimeout: 30000,
  connectionTimeout: 10000
});

// ─── CORS ─────────────────────────────────────────────────────────────────────

// Derive CORS allowed origins: explicit list, or from DOMAIN env var
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : process.env.DOMAIN
    ? [`https://${process.env.DOMAIN}`, `http://${process.env.DOMAIN}`]
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:80', 'http://localhost'];

fastify.addHook('onRequest', async (request, reply) => {
  const origin = request.headers.origin;
  const url    = request.url;

  if (url.startsWith('/f/') || url.startsWith('/uploads/')) {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (request.method === 'OPTIONS') { reply.status(204).send(); return; }
    return;
  }

  if (origin) {
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    if (isLocal || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
      reply.header('Access-Control-Allow-Credentials', 'true');
      if (request.method === 'OPTIONS') { reply.status(204).send(); return; }
    } else {
      console.warn(`[CORS] Blocked origin: ${origin} for ${url}`);
      return reply.status(403).send({ error: 'CORS not allowed' });
    }
  }
});

await fastify.register(cors, { origin: false });
await fastify.register(helmet, { contentSecurityPolicy: false });
await fastify.register(formbody);
await fastify.register(multipart, {
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024, files: 10 }
});

// Serve static file uploads
await fastify.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "sandbox allow-downloads");
  }
});

// ─── Rate limiting (in-memory) ────────────────────────────────────────────────

await fastify.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
  keyGenerator: (req) => `global-${getRequestIp(req)}`,
  errorResponseBuilder: (req, ctx) => ({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil(ctx.ttl / 1000)
  })
});

// ─── Decorate with middleware ─────────────────────────────────────────────────

fastify.decorate('auth',                  authMiddleware);
fastify.decorate('rateLimitFormSubmission', rateLimitPresets.formSubmission);
fastify.decorate('rateLimitSensitive',    rateLimitPresets.sensitive);
fastify.decorate('rateLimitExport',       rateLimitPresets.export);
fastify.decorate('rateLimitWebhookTest',  rateLimitPresets.webhookTest);
fastify.decorate('rateLimitWebhookRetry', rateLimitPresets.webhookRetry);
fastify.decorate('rateLimitReplyEmail',   rateLimitPresets.replyEmail);
fastify.decorate('rateLimitAuth',         rateLimitPresets.auth);

// ─── Request logging ──────────────────────────────────────────────────────────

fastify.addHook('onResponse', async (request, reply) => {
  if (request.url === '/health') return;
  const userId = request.user?.userId || 'anon';
  const ip     = getRequestIp(request);
  console.log(`[${new Date().toISOString()}] ${ip} ${request.method} ${request.url} ${reply.statusCode} ${reply.elapsedTime?.toFixed(0) || 0}ms user:${userId}`);
});

// ─── Routes ───────────────────────────────────────────────────────────────────

await fastify.register(publicRoutes);
await fastify.register(authRoutes,        { prefix: '/api/auth' });
await fastify.register(formRoutes,        { prefix: '/api/forms' });
await fastify.register(submissionRoutes,  { prefix: '/api/submissions' });
await fastify.register(webhookRoutes,     { prefix: '/api/webhooks' });

// ─── Frontend Dashboard Serving ──────────────────────────────────────────────

if (fs.existsSync(frontendDist)) {
  await fastify.register(fastifyStatic, {
    root: frontendDist,
    prefix: '/',
    decorateReply: false
  });
}

export const __BUILD_INFO__ = Object.freeze({
  project: 'GetForms',
  author: 'Lucky Yaduvanshi',
  repository: 'https://github.com/Luckyyaduvanshiofficial/getforms',
  license: 'Apache-2.0',
  version: '2.0.0',
  canary: 'LUCKY-YADUVANSHI-GETFORMS-ORIGINAL-AUTH-2026-V2'
});

fastify.addHook('onSend', async (request, reply) => {
  reply.header('X-Author', 'Lucky Yaduvanshi (https://github.com/Luckyyaduvanshiofficial)');
  reply.header('X-Powered-By', 'GetForms/2.0');
});

fastify.get('/api/info', async () => ({
  name: 'GetForms Open Source',
  version: '2.0.0',
  author: 'Lucky Yaduvanshi',
  repository: 'https://github.com/Luckyyaduvanshiofficial/getforms',
  license: 'Apache-2.0',
  status: 'ok'
}));

fastify.get('/health', async (request, reply) => {
  let dbHealthy = false;
  try {
    await sql`SELECT 1`;
    dbHealthy = true;
  } catch {}

  return reply.status(dbHealthy ? 200 : 503).send({
    status: dbHealthy ? 'healthy' : 'degraded',
    version: '2.0.0',
    author: 'Lucky Yaduvanshi',
    repository: 'https://github.com/Luckyyaduvanshiofficial/getforms',
    license: 'Apache-2.0',
    canary: 'LUCKY-YADUVANSHI-GETFORMS-ORIGINAL-AUTH-2026-V2',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: { database: dbHealthy ? 'ok' : 'error' }
  });
});

// ─── Error handlers ───────────────────────────────────────────────────────────

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  const isDev = process.env.NODE_ENV !== 'production';
  reply.status(error.statusCode || 500).send({
    error: error.name || 'Internal Server Error',
    message: isDev ? error.message : 'An error occurred'
  });
});

fastify.setNotFoundHandler(async (request, reply) => {
  if (request.url.startsWith('/api/') || request.url.startsWith('/f/') || request.url.startsWith('/uploads/')) {
    return reply.status(404).send({ error: 'Not Found', message: `${request.method} ${request.url} not found` });
  }
  if (fs.existsSync(frontendDist)) {
    return reply.sendFile('index.html', frontendDist);
  }
  return reply.status(404).send({ error: 'Not Found', message: `${request.method} ${request.url} not found` });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const closeGracefully = async (signal) => {
  console.log(`\nReceived ${signal}, shutting down…`);
  stopQueueWorker();
  try { await fastify.close(); console.log('✓ Fastify closed'); } catch (e) { console.error(e.message); }
  try { await sql.end(); console.log('✓ DB closed'); } catch (e) { console.error(e.message); }
  process.exit(0);
};

process.on('SIGINT',  closeGracefully);
process.on('SIGTERM', closeGracefully);

const start = async () => {
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';

  // Start background queue worker
  startQueueWorker();

  await fastify.listen({ port, host });

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  GetForms — Modern Open Source Form Backend (v2.0.0)');
  console.log('  Created by Lucky Yaduvanshi (Apache-2.0)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Env:        ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Database:   ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite (Embedded WAL)'}`);
  console.log(`  Server:     http://${host}:${port}`);
  console.log(`  Uploads:    http://${host}:${port}/uploads/`);
  console.log(`  Health:     http://${host}:${port}/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
};

start().catch(err => { fastify.log.error(err); process.exit(1); });
