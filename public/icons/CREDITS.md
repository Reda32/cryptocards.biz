# Icon credits

## Coin icons — `public/icons/crypto/`

Source: [spothq/cryptocurrency-icons](https://github.com/spothq/cryptocurrency-icons)
License: MIT

```
Copyright (c) 2016 Spothq

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Additional coin icons from [simple-icons](https://github.com/simple-icons/simple-icons)
(CC0 1.0), wrapped in a brand-coloured badge:

- `crypto/near.svg` (NEAR)
- `crypto/ton.svg` (TON)

Original placeholder SVGs (not official brand assets), replace when the source
and licence can be confirmed:

- `crypto/usde.svg` (Ethena USDe)
- `crypto/wco.svg` (Winity WCO)

## Network icons — `public/icons/networks/`

Most network icons reuse the coin art above (e.g. `tron.svg` from `trx.svg`,
`ethereum.svg` from `eth.svg`, `dogecoin.svg` from `doge.svg`, `litecoin.svg`
from `ltc.svg`).

Branded chain logos from [@web3icons/core](https://www.npmjs.com/package/@web3icons/core)
(MIT): `networks/base.svg`, `networks/arbitrum.svg`, `networks/scroll.svg`,
`networks/plasma.svg`, `networks/optimism.svg`.

These are original placeholder SVGs, not official brand assets:

- `networks/w-chain.svg` (W Chain)

## UI icons

- `src/components/ui/Icon.astro` — [Lucide](https://lucide.dev) (ISC licence): `check`, `x`, `copy`.

## Refreshing the icons

```bash
BASE=https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color
for s in btc eth usdt usdc bnb sol dai xrp ada dot matic link avax atom uni aave trx doge ltc xmr eur gbp; do
  curl -fsSL "$BASE/$s.svg" -o "public/icons/crypto/$s.svg"
done
```
