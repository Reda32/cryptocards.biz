# Community Score pipeline (not built yet)

This folder is a placeholder for the automated Community Score pipeline described in
section 7 of the project plan. It is **intentionally not implemented** in the first
release — the site already renders the score (or "Not enough data") from
`src/content/community/*.json`, so the UI is ready for when the pipeline lands.

## What to build here

```
scripts/community/
  fetch/appstore.ts     # iTunes Lookup API (average rating + count per storefront)
  fetch/playstore.ts    # google-play-scraper (npm, unofficial)
  fetch/trustpilot.ts   # official API or manual monthly entry
  fetch/reddit.ts       # official Reddit Data API
  fetch/x.ts            # official X API or manual curation
  classify.ts           # LLM sentiment + aspect tagging for Reddit/X posts
  score.ts              # normalisation + Bayesian adjust + weighting
  refresh.ts            # CLI: fetch -> filter -> classify -> score -> write JSON
```

`refresh.ts` should write one file per card to `src/content/community/<card-slug>.json`,
then a scheduled job (n8n or a cron container on Coolify) can commit the change and
trigger a rebuild via a Coolify webhook.

## Scoring spec (must match `/methodology`)

Normalise to a 0–10 scale:

- Star ratings (App Store, Play Store, Trustpilot): `score10 = rating * 2`
- Reddit / X posts: LLM classifies each post positive/neutral/negative, then
  `score10 = 5 + 5 * (positive - negative) / total`

Low-volume adjustment (Bayesian average):

```ts
function adjust(score: number, n: number, m: number, prior: number) {
  return (n * score + m * prior) / (n + m);
}
// Star sources:     m = 30, prior = 7.0
// Reddit / X posts: m = 10, prior = 5.5
```

Weights:

```ts
const WEIGHTS = {
  trustpilot: 0.3,
  appstore: 0.2,
  playstore: 0.2,
  reddit: 0.2,
  x: 0.1,
};

function communityScore(sources: { name: keyof typeof WEIGHTS; adjusted: number }[]) {
  if (sources.length < 3) return null; // "Not enough data"
  const totalWeight = sources.reduce((s, x) => s + WEIGHTS[x.name], 0);
  const sum = sources.reduce((s, x) => s + WEIGHTS[x.name] * x.adjusted, 0);
  return Math.round((sum / totalWeight) * 10) / 10; // renormalised
}
```

Filters, applied before scoring:

- Only the last 12 months, with newer items weighted higher.
- Drop posts containing referral links or promo codes.
- Drop very new accounts and obvious bot patterns.
- Drop reviews about the company's other products when an app is shared.

Category breakdown: in the same LLM pass, tag each item with the aspects it mentions
(support, fees, reliability, app, KYC ease) and whether each is positive or negative.
Only show a category with at least 10 mentions.

## Rules

- Never fabricate or round up source counts.
- Show "Not enough data" rather than a score built on thin evidence.
- Do **not** mark up the Community Score as `AggregateRating`. Only our editorial
  rating uses `Review` structured data.
- Verify each provider's current terms and pricing before building automation. A
  practical start: automate App Store + Play Store, enter Trustpilot manually, add
  Reddit next, and X only if it is worth the cost.
