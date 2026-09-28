#!/usr/bin/env node
/**
 * Guard against referral/tracking links sneaking into card data.
 * Prints any card whose `signupUrl` looks like an affiliate/tracking URL.
 *
 * Usage: node scripts/check-links.mjs
 * Exit code 1 when flagged links are found.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/content/cards');

// Tracking / affiliate patterns that should never appear in a default link.
// Note: a bare Telegram bot link (`t.me/<bot>` or `telegram.me/<bot>`) is an
// official channel and is allowed; only bot links with a `?start=` param flag.
const TRACKING = /(onelink\.me|\/referral\/|\/ref\/|\/r\/[A-Za-z0-9]{4,}|\/p\/[A-Za-z0-9]{6,}|\/invite\b|\/aff\/|referral_code|invite_code|deep_link_value|deep_link_sub|[?&](ref|aff|pid|referral|code|start|aff_id|affiliate|utm_[a-z]+)=)/i;

const cards = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));

const flagged = [];
const invalid = [];

for (const card of cards) {
  const url = card.signupUrl;
  if (!url) {
    invalid.push(`${card.slug}: missing signupUrl`);
    continue;
  }
  if (!/^https?:\/\//.test(url)) invalid.push(`${card.slug}: not http(s) (${url})`);
  if (TRACKING.test(url)) flagged.push(`${card.slug}: ${url}`);
}

console.log(`checked ${cards.length} cards`);
console.log(`missing/invalid: ${invalid.length}`);
invalid.forEach((l) => console.log('  - ' + l));
console.log(`tracking/affiliate links: ${flagged.length}`);
flagged.forEach((l) => console.log('  - ' + l));

if (invalid.length || flagged.length) process.exit(1);
console.log('all card links are clean official URLs');
