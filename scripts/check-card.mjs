#!/usr/bin/env node
/**
 * Duplicate check for a new card. See AGENTS.md ("Card Content Workflow").
 *
 * Usage:
 *   node scripts/check-card.mjs "Ether.fi Cash Card"
 *
 * Matching is normalized: lowercase, punctuation/spaces removed, generic tokens
 * (card, the, crypto) dropped, plus a small brand-variation alias map.
 *
 * Exit codes:
 *   0  no high-confidence duplicate (safe to create; review any "similar" notes)
 *   1  a likely duplicate was found — update the existing card instead
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = join(__dirname, '..', 'src', 'content', 'cards');

const GENERIC_TOKENS = ['card', 'the', 'crypto', 'cryptocurrency'];

/** Normalize a brand string for comparison. */
function normalize(value) {
  let out = String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, ''); // strip punctuation + spaces
  for (const token of GENERIC_TOKENS) {
    out = out.split(token).join('');
  }
  return out;
}

/** Brand-equivalent aliases (already normalized). */
const ALIASES = {
  etherfi: 'etherfi',
  etherficash: 'etherfi',
  redotpay: 'redotpay',
  kast: 'kast',
  avici: 'avici',
  nexo: 'nexo',
};

function canonical(value) {
  const n = normalize(value);
  return ALIASES[n] ?? n;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[n];
}

function loadCards() {
  return readdirSync(CARDS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const raw = JSON.parse(readFileSync(join(CARDS_DIR, file), 'utf8'));
      return {
        file,
        name: raw.name ?? '',
        slug: raw.slug ?? file.replace(/\.json$/, ''),
        company: raw.company ?? '',
      };
    });
}

const query = process.argv.slice(2).join(' ').trim();
if (!query) {
  console.error('Usage: node scripts/check-card.mjs "<card name>"');
  process.exit(2);
}

const qn = normalize(query);
const qc = canonical(query);

if (!qn) {
  console.error('Query has no comparable characters after normalization.');
  process.exit(2);
}

const cards = loadCards();
const results = [];

for (const card of cards) {
  const fields = [
    { field: 'name', value: card.name },
    { field: 'slug', value: card.slug },
    { field: 'company', value: card.company },
  ];
  let best = null;
  for (const { field, value } of fields) {
    const nv = normalize(value);
    const cv = canonical(value);
    let level = null;

    if (nv && nv === qn) level = 'exact';
    else if (cv && qc && cv === qc) level = 'brand';
    else if (nv.length >= 3 && qn.length >= 3 && (nv.includes(qn) || qn.includes(nv)))
      level = 'partial';
    else {
      const dist = levenshtein(qn, nv);
      const ratio = dist / Math.max(qn.length, nv.length || 1);
      if (dist <= 2 || ratio <= 0.2) level = 'similar';
    }

    if (level && (!best || rank(level) > rank(best.level))) best = { field, value, level };
  }
  if (best) results.push({ card, ...best });
}

function rank(level) {
  return { exact: 3, brand: 2, partial: 1, similar: 0 }[level] ?? -1;
}

results.sort((a, b) => rank(b.level) - rank(a.level));

console.log(`\nChecking "${query}" against ${cards.length} existing cards\n`);

if (results.length === 0) {
  console.log('No matches. Safe to create a new card page.');
  process.exit(0);
}

for (const r of results) {
  const label = {
    exact: 'DUPLICATE (exact match)',
    brand: 'DUPLICATE (same brand)',
    partial: 'POSSIBLE duplicate (partial match)',
    similar: 'SIMILAR (possible typo/variant)',
  }[r.level];
  console.log(`- ${r.card.name}  [${r.card.slug}]`);
  console.log(`  matched on ${r.field}="${r.value}" -> ${label}\n`);
}

const hasDuplicate = results.some((r) => r.level === 'exact' || r.level === 'brand');
if (hasDuplicate) {
  console.log('Do NOT create a new card. Update the existing card instead (AGENTS.md step 1).');
  process.exit(1);
}

console.log('No high-confidence duplicate. Review the "similar"/"partial" notes before creating.');
process.exit(0);
