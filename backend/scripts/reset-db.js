// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'getform.db');
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

console.log('🔄 Resetting GetForms SQLite database for fresh self-host installation...');

try {
  const dbFiles = [
    dbFile,
    `${dbFile}-wal`,
    `${dbFile}-shm`,
    path.join(__dirname, '..', 'getform.db')
  ];

  for (const f of dbFiles) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`✓ Removed ${path.basename(f)}`);
    }
  }

  console.log('✓ SQLite database cleared. Next server startup will create clean tables and prompt for first-run setup.');
} catch (err) {
  console.error('❌ Failed to reset database:', err);
}
