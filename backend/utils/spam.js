// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import crypto from 'crypto';

/**
 * Universal Spam & Bot Protection Engine
 * Supports:
 *  - Invisible Honeypots
 *  - Cloudflare Turnstile
 *  - Google reCAPTCHA v2/v3
 *  - Altcha (Proof-of-Work)
 *  - Domain Origin Whitelist
 *  - Submission Timing Analysis
 */

export const HONEYPOT_FIELD_NAMES = new Set([
  'website',
  '_gotcha',
  '_honey',
  'hp_field',
  '_hp_name',
  'phone_number_verification',
  '_bot_trap'
]);

/**
 * Strips known honeypot fields and verifies if bot filled them in
 */
export function evaluateHoneypot(data = {}) {
  const cleanData = {};
  let isSpam = false;

  for (const [key, value] of Object.entries(data)) {
    if (HONEYPOT_FIELD_NAMES.has(key.toLowerCase())) {
      if (value && String(value).trim() !== '') {
        isSpam = true;
      }
    } else {
      cleanData[key] = value;
    }
  }

  return { isSpam, cleanData };
}

/**
 * Verify Cloudflare Turnstile Token
 */
export async function verifyTurnstile(token, secretKey, ip) {
  if (!token || !secretKey) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(6000)
    });

    const result = await res.json();
    return Boolean(result.success);
  } catch (err) {
    console.error('[Turnstile Verification Error]', err.message);
    return false;
  }
}

/**
 * Verify Google reCAPTCHA Token (v2 or v3)
 */
export async function verifyRecaptcha(token, secretKey, ip) {
  if (!token || !secretKey) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(6000)
    });

    const result = await res.json();
    // For v3, score >= 0.5 is considered human
    if (result.success && (result.score === undefined || result.score >= 0.4)) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('[reCAPTCHA Verification Error]', err.message);
    return false;
  }
}

/**
 * Verify Altcha (Proof-of-Work) Payload
 */
export function verifyAltcha(payloadBase64, hmacKey) {
  if (!payloadBase64 || !hmacKey) return false;

  try {
    const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const { algorithm, challenge, number, salt, signature } = JSON.parse(jsonStr);

    if (algorithm !== 'SHA-256') return false;

    // Verify HMAC signature of the challenge
    const expectedSig = crypto.createHmac('sha256', hmacKey).update(salt + challenge).digest('hex');
    if (expectedSig !== signature) return false;

    // Verify proof-of-work hash: sha256(salt + number) === challenge
    const hash = crypto.createHash('sha256').update(salt + number).digest('hex');
    return hash === challenge;
  } catch (err) {
    console.error('[Altcha Verification Error]', err.message);
    return false;
  }
}

/**
 * Check if the request Origin or Referer is permitted by form allowed_domains
 */
export function isAllowedOrigin(allowedDomains, requestOrigin, referer) {
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0 || allowedDomains.includes('*')) {
    return true;
  }

  const incomingUrl = requestOrigin || referer;
  if (!incomingUrl) return true; // Direct API or cURL allowed unless domain restriction explicitly active

  try {
    const url = new URL(incomingUrl);
    const host = url.hostname.toLowerCase();

    return allowedDomains.some(d => {
      const allowed = String(d).trim().toLowerCase();
      if (allowed === '*' || allowed === host) return true;
      if (allowed.startsWith('*.') && host.endsWith(allowed.slice(2))) return true;
      return false;
    });
  } catch {
    return false;
  }
}
