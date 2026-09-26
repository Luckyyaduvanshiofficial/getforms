// Copyright (c) 2026 Lucky Yaduvanshi. All rights reserved.
// Licensed under the Apache License, Version 2.0.
// Original source: https://github.com/Luckyyaduvanshiofficial/getforms

/**
 * Discord incoming webhook dispatcher
 * Sends beautiful rich embeds to Discord channels.
 */
export async function sendDiscordNotification(webhookUrl, { formName, endpoint, submissionData, metadata }) {
  if (!webhookUrl) return;

  const fields = Object.entries(submissionData || {})
    .slice(0, 25) // Discord limits embeds to 25 fields
    .map(([name, value]) => ({
      name: String(name).slice(0, 256),
      value: String(typeof value === 'object' ? JSON.stringify(value) : value).slice(0, 1024) || '—',
      inline: String(value).length < 40
    }));

  const payload = {
    username: 'GetForm Notifications',
    embeds: [
      {
        title: `📥 New Submission: ${formName || endpoint}`,
        description: `Received a new submission on form \`${endpoint}\`.`,
        color: 0x3b82f6, // Blue
        fields: fields.length > 0 ? fields : [{ name: 'Submission', value: 'Empty submission payload' }],
        footer: {
          text: `IP: ${metadata?.ip || 'unknown'} • GetForm Open Source`
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Discord webhook error ${response.status}: ${text}`);
  }
}
