#!/usr/bin/env node
/**
 * Add a non-affiliate provider sign-up URL (`signupUrl`) to imported cards.
 *
 * Each source card page links to `/go/<x>` which 302-redirects to the provider's
 * own site. We follow it and store the clean destination so the "Get card" CTA
 * and QR work before real affiliate links are supplied.
 *
 * Usage: node scripts/add-signup-links.mjs [--limit N]
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cardsDir = join(root, 'src/content/cards');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125 Safari/537.36';

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const jobs = [];
for (const file of readdirSync(cardsDir).filter((f) => f.endsWith('.json'))) {
  const card = JSON.parse(readFileSync(join(cardsDir, file), 'utf8'));
  if (card.verified !== false && card.signupUrl) continue;
  if (card.referral || card.signupUrl || !card.sourceUrl) continue;
  jobs.push({ file, slug: card.slug, sourceUrl: card.sourceUrl });
}

let cursor = 0;
let ok = 0;
const failed = [];
async function worker() {
  while (cursor < jobs.length) {
    if (ok >= LIMIT) return;
    const job = jobs[cursor++];
    if (!job) return;
    try {
      const html = await (
        await fetch(job.sourceUrl, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(25000) })
      ).text();
      const $ = cheerio.load(html);
      let href = '';
      $('a[href*="/go/"]').each((i, el) => {
        if (!href) href = $(el).attr('href') ?? '';
      });
      if (!href) throw new Error('no /go/ link');
      const goUrl = new URL(href, 'https://www.cryptocards.so').href;

      const res = await fetch(goUrl, { headers: { 'user-agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(25000) });
      const location = res.headers.get('location');
      if (!location) throw new Error(`no redirect (${res.status})`);
      const target = new URL(location, goUrl);
      if (/cryptocards\.so/.test(target.hostname)) throw new Error(`still on source: ${target.href}`);

      const path = join(cardsDir, job.file);
      const card = JSON.parse(readFileSync(path, 'utf8'));
      card.signupUrl = target.href;
      writeFileSync(path, `${JSON.stringify(card, null, 2)}\n`);
      ok++;
    } catch (err) {
      failed.push(`${job.slug}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
console.log(`signup links added: ${ok}`);
console.log(`failed: ${failed.length}`);
failed.forEach((f) => console.log('  - ' + f));
