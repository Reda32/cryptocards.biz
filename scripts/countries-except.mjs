#!/usr/bin/env node
/**
 * Prints the world country list (data/world-countries.json) minus the given
 * restricted countries, for cards whose provider only publishes an exclusion list.
 *
 * Usage: node scripts/countries-except.mjs "United States" "Russia" ...
 * Unknown names are reported on stderr so typos are caught.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const world = JSON.parse(readFileSync(join(root, 'data/world-countries.json'), 'utf8'));
const excluded = new Set(process.argv.slice(2));

for (const name of excluded) {
  if (!world.includes(name)) console.error(`not in world list (ignored): ${name}`);
}
console.log(JSON.stringify(world.filter((name) => !excluded.has(name)), null, 2));
