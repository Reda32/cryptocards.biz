# CryptoCards.biz

An SEO-first review, comparison and coupon site for crypto cards (RedotPay, KAST and
more). Static HTML with a tiny amount of interactivity, built with Astro and designed
to be deployed on [Coolify](https://coolify.io).

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Astro 7 (static output + Node adapter for on-demand routes) |
| Styling | Tailwind CSS v4 |
| Interactivity | Preact islands |
| Shared state | nanostores + `@nanostores/persistent` (localStorage) |
| Content | JSON + MDX via the Astro Content Layer API, stored in Git |
| Analytics | Umami (optional, self-hosted via Coolify) |
| Hosting | Coolify (Docker) |

There is no database. Card data lives in the repository, and the only server-rendered
route is `/go/[slug]`, which logs a click and redirects to the affiliate link.

## Quickstart

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static + server output in dist/
npm run preview  # preview the production build
npm run check    # astro check (types)
```

## Project structure

```
src/
  content.config.ts        # collections: cards, community, reviews
  content/
    cards/*.json           # structured card data (the source of truth)
    community/*.json       # Community Score per card
    reviews/*.mdx          # long-form editorial body
  components/
    *.astro                # server-rendered UI
    islands/*.tsx          # Preact islands (CompareBar, CompareTable, CopyCodeButton)
  lib/
    cards.ts               # data access + CompareCard projection
    types.ts               # framework-agnostic types + formatters
    pairs.ts               # curated "A vs B" pages
    topics.ts              # "best of" topics
    taxonomy.ts            # country + company grouping
    og.ts                  # Satori OG image renderer
  pages/
    cards/[slug].astro     # card review
    coupons/[slug].astro   # coupon / referral page
    compare/index.astro    # interactive compare tool
    compare/[pair].astro   # static head-to-head pages
    best/[topic].astro     # best-of lists
    countries/[country].astro
    company/[slug].astro
    go/[slug].ts           # affiliate redirect (prerender = false)
    og/[slug].png.ts       # build-time OG images
  stores/compare.ts        # nanostores compare selection
scripts/community/         # Community Score pipeline (not built yet)
```

## Adding a card

1. **Structured data** — create `src/content/cards/<slug>.json`. The schema lives in
   `src/content.config.ts`; the build fails if a field is missing or mistyped.
2. **Community score** — create `src/content/community/<slug>.json`. Use
   `"score": null` and `"sources": []` until the pipeline is built.
3. **Editorial body** (optional) — create `src/content/reviews/<slug>.mdx` with
   `cardSlug` and `title` frontmatter.

That is enough to generate the review page, coupon page, country/company pages,
best-of inclusion and OG image automatically.

> **⚠️ The two sample cards (RedotPay, KAST) use realistic placeholder data.**
> Fees, limits, KYC details and referral codes must be verified against each provider
> before launch. Set `lastVerified` to the date you checked them.

### Curated comparisons

Only add "A vs B" pages for queries people actually search. Edit `CURATED_PAIRS` in
`src/lib/pairs.ts`; each pair produces a `/compare/<a>-vs-<b>` page. The interactive
`/compare` tool works regardless, and links to a static page when one exists.

## Icons

Coin and network icons are self-hosted SVG (no CDN requests) under
`public/icons/`:

- Coin art comes from [spothq/cryptocurrency-icons](https://github.com/spothq/cryptocurrency-icons) (MIT) — see `public/icons/CREDITS.md`.
- `src/lib/icons.ts` maps a coin symbol or chain name to its icon path and returns `null` for anything unknown, so the UI falls back to a text monogram instead of a broken image.
- To add a coin, drop `<symbol>.svg` into `public/icons/crypto/` and add the symbol to `CRYPTO_ICONS` in `src/lib/icons.ts` (same pattern for `public/icons/networks/` + `NETWORK_SLUGS`).

## Theming

Dark mode is class-based (`html.dark`) via Tailwind's `dark:` variant.

- A tiny inline script in `BaseLayout.astro` applies the saved theme before paint (no flash of the wrong theme).
- `src/components/islands/ThemeToggle.tsx` toggles the class and persists the choice to `localStorage.theme`.
- With no saved choice, the system `prefers-color-scheme` is used.
- Colours are defined as tokens in `src/styles/global.css` (`@theme` + `color-scheme`); add new shades there so dark mode stays consistent.

## Community Score

The UI, data model and methodology page are complete. The **automation pipeline**
(fetchers + LLM classification) is deliberately deferred — see
[`scripts/community/README.md`](scripts/community/README.md) for the full spec and the
scoring rules that `/methodology` documents.

## Affiliate links

- Every CTA points at `/go/<card-slug>` and carries `rel="sponsored nofollow noopener"`.
- The redirect target is `referral.url` (affiliate) or `signupUrl` (provider fallback).
- Clicks are tracked client-side with Umami via `data-umami-event="affiliate_click"`.
- Always keep the affiliate disclosure visible on pages with referral links.

## SEO

- Static HTML, one `<h1>` per page, data-driven titles and descriptions.
- JSON-LD: `Review` (editorial rating only), `FAQPage`, `BreadcrumbList`, `Organization`,
  and `Offer` on coupon pages. The Community Score is **never** marked up as
  `AggregateRating`.
- Canonical URLs, `lastVerified` as `dateModified`, `@astrojs/sitemap`, `robots.txt`.
- Build-time Open Graph images (1200×630) via Satori, one per card.
- `/go/*` is disallowed in `robots.txt` and excluded from the sitemap.

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SITE_URL` | Canonical/site URL (defaults to `https://cryptocards.biz`) |
| `UMAMI_HOST` | Your self-hosted Umami URL, e.g. `https://an.cryptocards.biz` (server-side, used by the `/stats/*` proxy) |
| `PUBLIC_UMAMI_WEBSITE_ID` | Umami website id (public). Leave blank to disable analytics entirely. |

### Umami analytics (first-party proxy)

The tracking script is served from **`/stats/script.js`** and proxied to your
Umami instance, so it appears as first-party traffic and survives ad blockers.

- `src/pages/stats/[...path].ts` proxies `/stats/<x>` → `<UMAMI_HOST>/<x>`
  (script + `/api/send`), forwarding all headers.
- Affiliate clicks fire an `affiliate_click` event (data attributes on the CTA).
- Umami's default login is `admin` / `umami` — change it on first login.
- Session replay/heatmaps are optional and off by default.

## Deploying on Coolify

1. Push this repo to GitHub and connect it to Coolify.
2. Create an application from the repo; Coolify detects the `Dockerfile`.
3. Health check path: `/`. Exposed port: `4321`.
4. Add the environment variables above.
5. Set the domain and let Coolify provision HTTPS.
6. (Optional) Deploy Umami as a separate Coolify service
   (`ghcr.io/umami-software/umami:postgresql-latest` + Postgres), log in
   `admin`/`umami`, add a website, and point `UMAMI_HOST` +
   `PUBLIC_UMAMI_WEBSITE_ID` at it.

To refresh content automatically later: run the Community Score job on a schedule,
commit the updated JSON, then trigger a Coolify rebuild webhook.

## Notes

- Node 22+ is required.
- The plan's original "Astro 5" references map to the current Astro 7 APIs: the content
  collections use the Content Layer (`glob` loaders in `src/content.config.ts`), and
  `output: 'static'` + `export const prerender = false` replaces the old hybrid mode.
- Not financial advice. See `/terms`, `/privacy` and `/affiliate-disclosure`.
