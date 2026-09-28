#!/usr/bin/env node
/**
 * Enrich imported cards with factual data scraped from the source card pages
 * listed in `data/source-cards.json` (`card href`).
 *
 * Only factual fields are extracted (fees, limits, KYC, rewards, card type,
 * network, rating). Editorial prose (pros/cons/summaries) is NOT copied.
 *
 * Fills empty fields only; skips cards already `verified: true`.
 * Usage: node scripts/enrich-cards.mjs [--limit N]
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cardsDir = join(root, 'src/content/cards');
const source = JSON.parse(readFileSync(join(root, 'data/source-cards.json'), 'utf8'));

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const today = new Date().toISOString().slice(0, 10);

const slugify = (v) =>
  v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const hrefBySlug = new Map();
for (const row of source) {
  const name = (row['text-base'] || '').trim();
  if (name && row['card href']) hrefBySlug.set(slugify(name), row['card href']);
}

const money = (v) => {
  if (!v) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  if (/free|^none$/i.test(s)) return 0;
  if (/^(—|-|n\/?a|not\b.*|varies.*)$/i.test(s)) return null;
  const m = s.replace(/,/g, '').match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  return m ? Number(m[1]) : null;
};
const pct = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (/free|^0%?$/i.test(s)) return 0;
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  return m ? Number(m[1]) : null;
};
const clean = (v) => (v && v.trim() && v.trim() !== '—' ? v.trim() : undefined);

function extract($) {
  const valueOf = (label) => {
    let out = '';
    $('*').each((i, el) => {
      if (out) return;
      if ($(el).children().length === 0 && $(el).text().trim() === label) {
        const n = $(el).next().text().replace(/\s+/g, ' ').trim();
        if (n) out = n;
      }
    });
    return out;
  };
  const kycValue = (label) => {
    let out = '';
    $('*').each((i, el) => {
      if (out) return;
      if ($(el).children().length === 0 && $(el).text().trim() === label) {
        const n = $(el).parent().next().text().replace(/\s+/g, ' ').trim();
        if (n) out = n;
      }
    });
    return out;
  };

  const result = {};

  // -- fees --
  const monthly = money(valueOf('Monthly Fee'));
  const issuance = money(valueOf('Card Issuance') || valueOf('Card Issuance Fee'));
  const fx = pct(valueOf('FX Fee'));
  const decline = money(valueOf('Decline Fee'));
  const fees = {};
  if (monthly !== null) fees.monthly = monthly;
  if (issuance !== null) fees.issuance = issuance;
  if (fx !== null) fees.fx = fx;
  if (Object.keys(fees).length) {
    fees.issuance = fees.issuance ?? 0;
    fees.monthly = fees.monthly ?? 0;
    fees.fx = fees.fx ?? 0;
    fees.atm = valueOf('ATM Fee') || 'Not disclosed';
    const topup = clean(valueOf('Top-up Fee'));
    if (topup) fees.topup = topup;
    if (decline !== null) fees.decline = decline;
    result.fees = fees;
  }

  // -- limits --
  const daily = valueOf('Daily Spend') || valueOf('Daily Spending');
  const monthlySpend = valueOf('Monthly Spend') || valueOf('Monthly Spending');
  const atm = valueOf('ATM Withdrawal') || valueOf('Daily ATM');
  if (daily || monthlySpend || atm) {
    result.limits = {
      dailySpend: clean(daily) ?? 'Not disclosed',
      monthlySpend: clean(monthlySpend) ?? 'Not disclosed',
      atmWithdrawal: clean(atm) ?? 'Not disclosed',
    };
  }

  // -- rewards --
  const cashback = clean(valueOf('Cashback') || valueOf('Cashback Rate'));
  const cashbackToken = clean(valueOf('Cashback Crypto'));
  const welcome = clean(valueOf('Welcome Bonus'));
  const referral = clean(valueOf('Referral Bonus'));
  if (cashback || cashbackToken || welcome || referral) {
    result.rewards = {
      ...(cashback ? { cashback } : {}),
      ...(cashbackToken ? { cashbackToken } : {}),
      ...(welcome ? { welcomeBonus: welcome } : {}),
      ...(referral ? { referralBonus: referral } : {}),
    };
  }

  // -- card info --
  const typeText = valueOf('Card Type');
  if (typeText) {
    const t = [];
    if (/virtual/i.test(typeText)) t.push('virtual');
    if (/physical/i.test(typeText)) t.push('physical');
    if (t.length) result.type = t;
  }
  const net = valueOf('Card Network');
  if (/visa/i.test(net)) result.network = 'visa';
  else if (/mastercard/i.test(net)) result.network = 'mastercard';

  // -- kyc --
  const levelText = valueOf('KYC Level');
  if (levelText) {
    let level = 'id';
    if (/no kyc|none/i.test(levelText)) level = 'none';
    else if (/full/i.test(levelText)) level = 'full';
    else if (/basic|email/i.test(levelText)) level = 'basic';
    const req = (label) => /^required/i.test(kycValue(label));
    result.kyc = {
      level,
      email: req('Email Verification'),
      phone: req('Phone Verification'),
      idDocument: req('Identity Document'),
      proofOfAddress: req('Proof of Address'),
      selfie: req('Selfie Verification'),
      notes: 'Requirements as published by the provider; confirm during onboarding.',
    };
  }

  // -- rating (overall) --
  let rating = null;
  $('*').each((i, el) => {
    if (rating !== null) return;
    const cls = $(el).attr('class') || '';
    const t = $(el).text().trim();
    if (/text-\[26px\]/.test(cls) && /^\d(\.\d+)?$/.test(t) && $(el).children().length === 0) {
      rating = Number(t);
    }
  });
  if (rating !== null) result.rating = rating;

  return result;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125 Safari/537.36' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const report = { enriched: [], partial: [], failed: [], skipped: [] };
const files = readdirSync(cardsDir).filter((f) => f.endsWith('.json'));

const queue = [];
for (const file of files) {
  const slug = file.replace(/\.json$/, '');
  const card = JSON.parse(readFileSync(join(cardsDir, file), 'utf8'));
  // Only imported cards (explicit verified:false). Curated + already-verified
  // cards have no `verified` key or verified:true -> untouched.
  if (card.verified !== false) { report.skipped.push(slug); continue; }
  const href = hrefBySlug.get(slug) || card.sourceUrl;
  if (!href) { report.failed.push(`${slug}: no source url`); continue; }
  queue.push({ slug, href });
}

let cursor = 0;
let processed = 0;
async function worker() {
  while (cursor < queue.length) {
    if (processed >= LIMIT) return;
    const job = queue[cursor++];
    if (!job) return;
    processed++;
    const cardPath = join(cardsDir, `${job.slug}.json`);
    try {
      const html = await fetchPage(job.href);
      const $ = cheerio.load(html);
      const data = extract($);

      const card = JSON.parse(readFileSync(cardPath, 'utf8'));
      // Source is authoritative for these factual fields on imported cards.
      if (data.fees) card.fees = data.fees;
      if (data.limits) card.limits = data.limits;
      if (data.rewards) card.rewards = data.rewards;
      if (data.kyc) card.kyc = data.kyc;
      if (data.type && data.type.length) card.type = data.type;
      if (data.network) card.network = data.network;
      if (card.rating == null && data.rating != null) card.rating = data.rating;
      card.lastVerified = today;

      const complete = Boolean(card.fees && card.limits && card.kyc);
      card.verified = complete;

      writeFileSync(cardPath, `${JSON.stringify(card, null, 2)}\n`);
      (complete ? report.enriched : report.partial).push(
        `${job.slug} fees=${!!card.fees} limits=${!!card.limits} kyc=${card.kyc?.level ?? '-'} rating=${card.rating ?? '-'}`,
      );
    } catch (err) {
      report.failed.push(`${job.slug}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 6 }, worker));

console.log(`verified/enriched: ${report.enriched.length}`);
console.log(`partial (stayed noindex): ${report.partial.length}`);
report.partial.forEach((r) => console.log('  - ' + r));
console.log(`failed: ${report.failed.length}`);
report.failed.forEach((r) => console.log('  - ' + r));
console.log(`skipped (already verified): ${report.skipped.length}`);
