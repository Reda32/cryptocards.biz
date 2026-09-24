// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://cryptocards.biz',
  // Static-first. Routes that must run on the server opt out with
  // `export const prerender = false` (e.g. /go/[slug]).
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact(), mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
});
