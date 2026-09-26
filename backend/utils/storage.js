// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Validates if the file mime matches the form's allowed file types
 */
export function isAllowedMimeType(mime, allowedTypes = []) {
  if (!allowedTypes || allowedTypes.length === 0 || allowedTypes.includes('*') || allowedTypes.includes('*/*')) {
    return true;
  }

  return allowedTypes.some(type => {
    const pattern = type.trim().toLowerCase();
    if (pattern === mime.toLowerCase()) return true;
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return mime.toLowerCase().startsWith(prefix);
    }
    return false;
  });
}

/**
 * Save an uploaded file buffer to local storage (or S3 if configured)
 */
export async function saveUploadedFile({ buffer, originalName, mimeType }) {
  const ext = path.extname(originalName) || '';
  const safeBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const filename = `${safeBaseName}-${uniqueId}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);

  const baseUrl = process.env.BASE_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : 'http://localhost:3001');
  const publicUrl = `${baseUrl}/uploads/${filename}`;

  return {
    filename,
    originalName,
    mimeType,
    size: buffer.length,
    publicUrl,
    filePath
  };
}

export { UPLOADS_DIR };
