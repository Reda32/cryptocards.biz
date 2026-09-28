# Card logo credits

Card brand logos are the **trademarks of their respective owners** and are used here
for identification purposes only (nominative fair use). They do not imply endorsement.

## Official logos (sourced from the cryptocards.so CDN)

| File | Card | Original | Notes |
| --- | --- | --- | --- |
| `kast.svg` | KAST | `logos/kast-logo.svg` | SVG, viewBox added |
| `etherfi.svg` | Ether.fi | `logos/etherfi.svg` | SVG |
| `redotpay.svg` | RedotPay | `logos/RedotPay Official_….svg` | SVG |
| `avici.webp` | Avici | `logos/avici.avif` | converted to WebP 256×256 |
| `nexo.webp` | Nexo | `logos/nexo_logo.jpg` | converted to WebP 256×256 |
| `gemini.webp` | Gemini | `logos/gemini-logo.png` | converted to WebP 256×256 |

## Placeholder logos (original monograms)

These cards are not in the source list, so the logos are original placeholder monograms.
Replace them with official brand assets when available:

- `kosh.svg` (Kosh)
- `mine.svg` (Mine)
- `plasma-one.svg` (Plasma One)

## Adding / refreshing a logo

1. Drop the asset into `public/logos/` (prefer SVG; otherwise use a square raster and
   convert to WebP 256×256).
2. Point the card's `logo` field in `src/content/cards/<slug>.json` at the file.
3. `CardLogo.astro` renders SVG as-is and gives raster logos a white `object-contain`
   frame so non-square images are not stretched.
