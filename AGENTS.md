# AGENTS.md

Guidance for AI agents and contributors working on CryptoCards.biz.

## Project

Astro 7 static site (+ Node adapter for `/go/[slug]`), Tailwind v4, Preact islands,
nanostores, content collections. See `README.md` for the full architecture.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (`dist/`)
- `npm run preview` — preview the build
- `npm run check` — `astro check` (types) + the official-links guard. Must pass before committing.
- `node scripts/check-card.mjs "<name>"` — duplicate check before adding a card

Always run `npm run check` **and** `npm run build` before committing. For UI changes,
verify mobile (320/375/414px) has no horizontal page overflow.

---

## Card Content Workflow (persistent rule)

Every time a new card is provided, follow this exactly.

### 1. Duplicate check first

Run:

```bash
node scripts/check-card.mjs "Card Name"
```

- If a match is flagged, **do not create a duplicate page.** Update the existing card
  instead.
- Matching is normalized: case-insensitive, punctuation/spaces ignored, generic tokens
  (`card`, `the`, `crypto`) dropped, and common brand variations handled via the alias
  map in the script.

### 2. Create the card

Create `src/content/cards/<slug>.json` (schema: `src/content.config.ts`) plus:

- The filename **must** equal the card's `slug` and the card needs an official
  `signupUrl`. That is what makes the card appear and save correctly in the `/admin`
  panel, where the owner manages its affiliate link and promo code (`npm run check`
  fails otherwise).
- Pull `main` first: the owner's admin edits are commits on `main`.
- **Renaming a slug** (changes the card's URLs): `git mv` the card, community and review
  files to the new slug, update `slug`/`cardSlug`, and add `'old-slug': 'new-slug'` to
  `SLUG_REDIRECTS` in `astro.config.mjs` so every old URL answers with a 301.

- `src/content/community/<slug>.json` — `score: null`, `sources: []` until the pipeline
  runs.
- `src/content/reviews/<slug>.mdx` — long-form editorial body (`cardSlug`, `title`).
- `public/logos/<slug-ish>.svg` — logo.

### 3. Every card must generate these SEO pages

These are produced automatically from card data — no manual page files per card:

| Page | URL | Title pattern |
| --- | --- | --- |
| Promo Codes & Coupons | `/coupons/<slug>` | `[Card Name] Promo Codes & Coupons 2026` |
| Review | `/cards/<slug>` | `[Card Name] Review 2026: Fees, Limits, KYC & Supported Countries` |
| Available Countries | `/cards/<slug>/countries` | `[Card Name] Available Countries 2026: Supported Countries & Regions` |

A card is only complete when all three render with real, non-thin content.

### 4. Content priority (internal linking)

1. **Promo Codes & Coupons** — primary commercial CTA
2. **Review**
3. **Available Countries**
4. Main card/product page

Promo is linked first/prominently; then review; then countries.

### 5. Review page sections (in order)

Overview · Fees · Limits · KYC / Verification · Supported Countries (summary + link to the
full page) · Card Availability · Features · Supported Cryptocurrencies · Variants ·
Community Sentiment · Pros & Limitations (factual, not exaggerated) · How to get the card ·
Full review · FAQ · Promo code CTA.

### 6. Promo / coupon page must explain

Current available code/offer · what the user receives · eligibility · how to apply ·
expiration/validity (when known) · important terms · alternative offers/referral options.
Target naturally: `[card] promo code`, `coupon`, `referral code`, `discount code`,
`bonus`, `offers`, `promotions`.

### 7. Available Countries page must include

Supported countries · unsupported/restricted countries · eligibility by country/region ·
card availability · residency/KYC requirements · how to check current availability.

### 8. Accuracy rules

- Never invent fees, limits, KYC requirements, promotions or country availability. If a
  value is unknown, leave the optional field empty rather than guessing.
- Always set `lastVerified` to the date the data was checked.
- Referral codes/URLs are placeholders until the owner supplies real affiliate links;
  keep them explicitly marked.
- Factual pros/cons only — no exaggerated claims.

### 9. Finish

`npm run check` + `npm run build`, confirm the new routes return 200 and appear in the
sitemap, then commit with a message like `Add <Card Name> card`.

---

## Bulk import (listing scrape)

Cards imported from a listing scrape are marked `verified: false`. They render,
but their review / coupons / countries pages are **noindexed** and excluded from
the sitemap until a human fills in fees, limits, KYC, countries and review copy,
then flips `verified` to `true`.

```bash
node scripts/import-cards.mjs data/source-cards.json   # import/skip duplicates
node scripts/normalize-logos.mjs                        # rasterise logos to WebP with a fitting background
node scripts/enrich-cards.mjs                           # scrape the source card pages for fees/limits/KYC
```

- Import skips any card whose normalized name/slug/company already exists.
- `enrich-cards.mjs` reads each card's `sourceUrl`, extracts the **factual** fields
  (fees, limits, KYC, rewards, card type, network, rating) and sets `verified`
  when fees + limits + KYC are present. It only touches `verified: false` cards
  and never copies editorial prose (pros/cons/summaries).
- Logos are self-hosted under `public/logos/imported/`. Light logos (built for
  dark backgrounds) get a dark tile so they stay visible.
- Never leave an imported card `verified: true` without real, checked data.
- Per-card countries pages with no country list are kept out of the sitemap and
  noindexed (thin content).

---

## Card links (official vs affiliate)

Every card has an official provider link in `signupUrl`. `/go/<slug>` redirects to
`referral.url` (an affiliate link with a real code + bonus) when present, else to
`signupUrl` (the official provider site). There is no env override: links are managed
only through the card data / `/admin`.

To make a link affiliate, add a `referral` object to the card JSON (real `code`,
`url`, `bonus`) — that enables the coupon/offer page. Otherwise leave it as the
official `signupUrl`. Placeholder codes are never shipped.

The owner can also manage `referral` from the `/admin` panel, which commits the card
JSON to GitHub (see README → Admin panel). Pull before editing card files.

---

## Conventions

- No comments unless they add real value.
- Match existing component/style patterns; Tailwind tokens live in `src/styles/global.css`.
- Affiliate links go through `/go/<slug>` with `rel="sponsored nofollow noopener"`.
- Never mark up the Community Score as `AggregateRating`.
