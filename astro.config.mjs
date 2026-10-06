// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

/**
 * Build the set of URLs that must stay out of the sitemap: pages for cards that
 * are imported but not yet human-verified (`verified: false`, which we noindex).
 */
const cardsDir = join(process.cwd(), 'src/content/cards');
const excluded = new Set();
const verifiedCompanySlugs = new Set();
const unverifiedCompanySlugs = new Set();

/** @param {string} name */
const companySlug = (name) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

for (const file of readdirSync(cardsDir).filter((f) => f.endsWith('.json'))) {
  const card = JSON.parse(readFileSync(join(cardsDir, file), 'utf8'));
  const company = companySlug(card.company ?? '');

  if (card.verified === false) {
    excluded.add(`/cards/${card.slug}`);
    excluded.add(`/cards/${card.slug}/countries`);
    excluded.add(`/coupons/${card.slug}`);
    unverifiedCompanySlugs.add(company);
  } else {
    verifiedCompanySlugs.add(company);
  }
  // Per-card countries pages with no country list are thin -> keep them out.
  if (!Array.isArray(card.countries) || card.countries.length === 0) {
    excluded.add(`/cards/${card.slug}/countries`);
  }
}

// Company pages with no verified cards are thin.
for (const company of unverifiedCompanySlugs) {
  if (!verifiedCompanySlugs.has(company)) excluded.add(`/company/${company}`);
}

// https://astro.build/config
export default defineConfig({
  site: 'https://cryptocards.biz',
  // Static-first. Routes that must run on the server opt out with
  // `export const prerender = false` (e.g. /go/[slug]).
  output: 'static',
  // Keep URLs, canonical tags and the sitemap in agreement: no trailing slash.
  trailingSlash: 'never',
  adapter: node({ mode: 'standalone' }),
  // Behind Coolify's proxy, trust X-Forwarded-Host/Proto for our own domains so
  // request URLs (and the form origin check on /admin) see https://cryptocards.biz.
  security: {
    allowedDomains: [
      { hostname: 'cryptocards.biz', protocol: 'https' },
      { hostname: 'www.cryptocards.biz', protocol: 'https' },
    ],
  },
  integrations: [
    preact(),
    mdx(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\/$/, '');
        if (pathname === '/admin' || pathname.startsWith('/admin/')) return false;
        return !excluded.has(pathname);
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Emit CSS with a stable (unhashed) name. A stale cached HTML then
          // always resolves the stylesheet instead of 404ing on a changed hash.
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
            if (name.endsWith('.css')) return 'styles/[name][extname]';
            return '_astro/[name].[hash][extname]';
          },
        },
      },
    },
  },
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
});
