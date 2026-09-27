/**
 * Crypto + network icon lookup. Client-safe (no framework/`astro:content`
 * imports) so the compare island can use it too.
 *
 * Icons are self-hosted under `public/icons/`. Coin art comes from
 * `cryptocurrency-icons` (MIT); see `public/icons/CREDITS.md`.
 */

const CRYPTO_ICONS = new Set([
  'btc',
  'eth',
  'usdt',
  'usdc',
  'bnb',
  'sol',
  'dai',
  'xrp',
  'ada',
  'dot',
  'matic',
  'link',
  'avax',
  'atom',
  'uni',
  'aave',
  'trx',
  'usde',
]);

/** `/icons/crypto/usdt.svg` for a known symbol, otherwise `null`. */
export function cryptoIcon(symbol: string): string | null {
  const key = symbol.toLowerCase().trim();
  return CRYPTO_ICONS.has(key) ? `/icons/crypto/${key}.svg` : null;
}

const NETWORK_SLUGS: Record<string, string> = {
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
  solana: 'solana',
  base: 'base',
  tron: 'tron',
  bsc: 'bsc',
  polygon: 'polygon',
  'xrp ledger': 'xrp',
  xrp: 'xrp',
  cardano: 'cardano',
  polkadot: 'polkadot',
  avalanche: 'avalanche',
  cosmos: 'cosmos',
};

/** `/icons/networks/ethereum.svg` for a known chain, otherwise `null`. */
export function networkIcon(name: string): string | null {
  const slug = NETWORK_SLUGS[name.toLowerCase().trim()];
  return slug ? `/icons/networks/${slug}.svg` : null;
}
