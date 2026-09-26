// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

import path from 'path';
import { fileURLToPath } from 'url';
import sql from '../utils/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanDatabase() {
  console.log('🧹 Cleaning test data from GetForms database...');

  try {
    // Delete all submissions, webhook logs, delivery queue items
    await sql`DELETE FROM webhook_logs`;
    await sql`DELETE FROM delivery_queue`;
    await sql`DELETE FROM submissions`;
    await sql`UPDATE forms SET submission_count = 0`;

    // If --all flag is passed, also remove test forms
    if (process.argv.includes('--all') || process.argv.includes('--purge-forms')) {
      await sql`DELETE FROM forms`;
      console.log('✓ All forms purged.');
    }

    console.log('✓ All test submissions and delivery queue logs purged successfully.');
    console.log('✓ Ready for real self-hosted form submissions!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clean database:', err);
    process.exit(1);
  }
}

cleanDatabase();
