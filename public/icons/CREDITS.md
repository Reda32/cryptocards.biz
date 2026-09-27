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

## Network icons — `public/icons/networks/`

Most network icons reuse the coin art above (e.g. `tron.svg` from `trx.svg`,
`ethereum.svg` from `eth.svg`).

These are original placeholder SVGs, not official brand assets:

- `networks/base.svg` (Base)
- `crypto/usde.svg` (Ethena USDe)

Replace them with the official brand assets when you can confirm the source and
license.

## Refreshing the icons

```bash
BASE=https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color
for s in btc eth usdt usdc bnb sol dai xrp ada dot matic link avax atom uni aave trx; do
  curl -fsSL "$BASE/$s.svg" -o "public/icons/crypto/$s.svg"
done
```
