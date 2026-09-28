#!/usr/bin/env node
/**
 * Normalise imported card logos to WebP with a background that suits them.
 *
 * Some brand marks are white/very light (built for dark backgrounds) and vanish
 * on our light UI. We rasterise every logo, measure the luminance of its visible
 * pixels, and flatten it onto white (dark logos) or dark slate (light logos),
 * then point the card JSON at the .webp.
 *
 * Usage: node scripts/normalize-logos.mjs
 */

import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public/logos/imported');
const cardsDir = join(root, 'src/content/cards');

const LIGHT_BG = { r: 255, g: 255, b: 255, alpha: 1 };
const DARK_BG = { r: 15, g: 23, b: 42, alpha: 1 }; // slate-900

async function meanLuminance(buffer) {
  const { data, info } = await sharp(buffer, { density: 288 })
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3];
    if (a < 24) continue;
    // luminance on 0..1
    const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    sum += lum;
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

const files = readdirSync(dir).filter((f) => /\.(svg|png|jpg|jpeg|webp|avif)$/i.test(f));
const results = [];

for (const file of files) {
  const inPath = join(dir, file);
  const slug = basename(file, extname(file));
  const buffer = readFileSync(inPath);

  let luminance = 0;
  try {
    luminance = await meanLuminance(buffer);
  } catch {
    luminance = 0; // treat unreadable as dark
  }

  const bg = luminance > 0.72 ? DARK_BG : LIGHT_BG;
  const outPath = join(dir, `${slug}.webp`);

  await sharp(buffer, { density: 288 })
    .resize(256, 256, { fit: 'contain', background: bg })
    .flatten({ background: bg })
    .webp({ quality: 90 })
    .toFile(outPath);

  if (inPath !== outPath && existsSync(inPath)) rmSync(inPath);

  // Point the card JSON at the webp.
  const cardPath = join(cardsDir, `${slug}.json`);
  if (existsSync(cardPath)) {
    const card = JSON.parse(readFileSync(cardPath, 'utf8'));
    card.logo = `/logos/imported/${slug}.webp`;
    writeFileSync(cardPath, `${JSON.stringify(card, null, 2)}\n`);
  }

  results.push({ slug, lum: luminance.toFixed(2), bg: luminance > 0.72 ? 'dark' : 'light' });
}

const dark = results.filter((r) => r.bg === 'dark');
console.log(`normalised ${results.length} logos`);
console.log(`light logos on dark background: ${dark.length}`);
dark.forEach((r) => console.log(`  - ${r.slug} (lum ${r.lum})`));
