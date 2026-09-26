// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing JWT_SECRET in environment variables');
  }
  // Safe auto-generated default for local development so it doesn't crash on initial boot
  JWT_SECRET = 'getform-local-dev-secret-32-chars-key!!';
  console.warn('⚠️  JWT_SECRET not set in .env — using default dev key. Set JWT_SECRET in production.');
}

const secret = new TextEncoder().encode(JWT_SECRET);
const JWT_TTL = '7d';
const BCRYPT_ROUNDS = 10;

// ─── JWT ──────────────────────────────────────────────────────────────────────

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_TTL)
    .sign(secret);
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
