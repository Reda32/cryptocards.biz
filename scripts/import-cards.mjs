#!/usr/bin/env node
/**
 * Import cards from a cryptocards.so listing scrape into the content
 * collections. Unverified imports get `verified: false` (noindexed) until a
 * human fills in fees, limits, KYC, countries and review copy.
 *
 * Usage: node scripts/import-cards.mjs [data/source-cards.json]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcFile = process.argv[2] ?? join(root, 'data/source-cards.json');
const cardsDir = join(root, 'src/content/cards');
const communityDir = join(root, 'src/content/community');
const logosDir = join(root, 'public/logos/imported');

const source = JSON.parse(readFileSync(srcFile, 'utf8'));

const slugify = (v) =>
  v
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const normalize = (v) => slugify(v).replace(/-/g, '');

// Existing cards (name + slug) for the duplicate check.
const existing = new Set();
for (const file of readdirSync(cardsDir).filter((f) => f.endsWith('.json'))) {
  const c = JSON.parse(readFileSync(join(cardsDir, file), 'utf8'));
  existing.add(normalize(c.name));
  existing.add(normalize(c.slug));
  if (c.company) existing.add(normalize(c.company));
}

const GENERIC = ['card', 'the', 'crypto', 'cryptocurrency'];
const aliasKey = (v) => {
  let n = normalize(v);
  for (const t of GENERIC) n = n.split(t).join('');
  return n;
};

const today = new Date().toISOString().slice(0, 10);

const COIN = /^[A-Z0-9]{2,6}$/;
const NETWORK = { visa: 'visa', mastercard: 'mastercard' };

function deriveCompany(name) {
  return name
    .replace(/\s+(virtual|physical|metal|premium|platinum|standard|starter|basic|elite|business|corporate|infinite)\b.*$/i, '')
    .replace(/\s+(visa|mastercard)\b.*$/i, '')
    .replace(/\s+card$/i, '')
    .replace(/\s+(virtual|physical)\s+card$/i, '')
    .trim() || name;
}

function pickPriceMonthly(label) {
  const m = /^\$(\d+(?:\.\d+)?)\s*\/\s*mo$/i.exec(label || '');
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 && n < 200 ? n : null;
}

const report = { imported: [], skipped: [], logos: { ok: 0, webp: 0, svg: 0, failed: [] } };
mkdirSync(logosDir, { recursive: true });

async function fetchLogo(src, slug) {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const head = buf.slice(0, 200).toString('utf8');
    const isSvg = head.includes('<svg') || src.split('?')[0].endsWith('.svg');
    if (isSvg) {
      writeFileSync(join(logosDir, `${slug}.svg`), buf);
      report.logos.ok++;
      report.logos.svg++;
      return `/logos/imported/${slug}.svg`;
    }
    const sharp = (await import('sharp')).default;
    await sharp(buf)
      .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(join(logosDir, `${slug}.webp`));
    report.logos.ok++;
    report.logos.webp++;
    return `/logos/imported/${slug}.webp`;
  } catch (err) {
    report.logos.failed.push(`${slug}: ${err.message}`);
    return undefined;
  }
}

for (const row of source) {
  const name = (row['text-base'] || '').trim();
  if (!name) continue;
  const slug = slugify(name);
  const key = aliasKey(name);

  if (existing.has(normalize(slug)) || existing.has(key) || existing.has(aliasKey(slug))) {
    report.skipped.push(name);
    continue;
  }

  const badges = [row['badge'], row['badge (2)'], row['badge (3)'], row['badge (4)']]
    .filter(Boolean)
    .map((b) => String(b));
  const type = [];
  if (badges.some((b) => /virtual/i.test(b))) type.push('virtual');
  if (badges.some((b) => /physical/i.test(b))) type.push('physical');
  const network = badges.map((b) => NETWORK[b.toLowerCase()]).find(Boolean);
  const noKyc = badges.some((b) => /no kyc/i.test(b));
  const requiresKyc = badges.some((b) => /kyc/i.test(b));

  const coinBadges = [
    row['inline-flex (2)'],
    row['inline-flex (3)'],
    row['inline-flex (4)'],
    row['inline-flex (5)'],
  ].filter((v) => v && COIN.test(String(v).trim()));
  const cryptos = [...new Set(coinBadges.map((v) => String(v).trim()))].map((symbol) => ({
    symbol,
    networks: [],
  }));

  const ratingMatch = /([\d.]+)\s*\/\s*10/.exec(row['font-semibold'] || '');
  const rating = ratingMatch ? Number(ratingMatch[1]) : null;

  const summary = (row['text-xs'] || '').trim();
  const priceLabel = (row['text-text-primary'] || '').trim() || undefined;
  const monthly = pickPriceMonthly(priceLabel);

  const card = {
    name,
    slug,
    company: deriveCompany(name),
    summary,
    type,
    ...(network ? { network } : {}),
    wallets: [],
    features: [],
    ...(monthly !== null
      ? { fees: { issuance: 0, monthly, fx: 0, atm: 'Not disclosed' } }
      : {}),
    rewards: {
      ...(row['inline-flex'] ? { cashback: String(row['inline-flex']).trim() } : {}),
    },
    countries: [],
    restrictedCountries: [],
    cryptos,
    kyc: noKyc
      ? { level: 'none', notes: 'Listed as no-KYC. Requirements not yet independently verified.' }
      : {
          level: 'id',
          notes: 'Requires KYC. Exact document requirements not yet independently verified.',
        },
    ...(rating !== null ? { rating } : {}),
    pros: [],
    cons: [],
    variants: [],
    faq: [],
    ...(row['biz-band'] ? { features: ['business'] } : {}),
    priceLabel,
    verified: false,
    ...(row['card href'] ? { sourceUrl: row['card href'] } : {}),
    lastVerified: today,
  };

  // Trim empty objects the schema does not need.
  if (Object.keys(card.rewards).length === 0) delete card.rewards;

  const logo = await fetchLogo(row['object-contain src'], slug);
  if (logo) card.logo = logo;

  writeFileSync(join(cardsDir, `${slug}.json`), `${JSON.stringify(card, null, 2)}\n`);

  writeFileSync(
    join(communityDir, `${slug}.json`),
    `${JSON.stringify(
      {
        cardSlug: slug,
        score: null,
        updatedAt: today,
        sources: [],
        summary:
          'Not enough data yet. We publish a Community Score once at least three of the five tracked sources have sufficient recent activity.',
      },
      null,
      2,
    )}\n`,
  );

  report.imported.push({ name, slug, logo: Boolean(logo), kyc: noKyc ? 'none' : 'id' });
}

console.log(`source entries: ${source.length}`);
console.log(`imported: ${report.imported.length}`);
console.log(`skipped (already exist): ${report.skipped.length} -> ${report.skipped.join(', ')}`);
console.log(`logos: svg=${report.logos.svg} webp=${report.logos.webp} failed=${report.logos.failed.length}`);
if (report.logos.failed.length) console.log('  failed:', report.logos.failed.join('; '));
