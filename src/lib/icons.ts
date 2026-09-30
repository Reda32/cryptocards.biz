/**
 * Crypto + network icon lookup. Client-safe (no framework/`astro:content`
 * imports) so the compare island can use it too.
 *
 * Icons are self-hosted under `public/icons/`. Coin art comes from
 * `cryptocurrency-icons` (MIT) and `simple-icons` (CC0); see
 * `public/icons/CREDITS.md` for full attribution.
 *
 * Some tickers/chain names are spelled differently across card data (e.g.
 * "ETH" vs "Ethereum", "POL" vs "MATIC"), so the maps below resolve aliases to
 * a single local asset without editing the source card JSON.
 */

/** symbol (lowercase) -> file basename under `public/icons/crypto/`. */
const CRYPTO_FILES: Record<string, string> = {
  aave: 'aave',
  ada: 'ada',
  atom: 'atom',
  avax: 'avax',
  bnb: 'bnb',
  btc: 'btc',
  dai: 'dai',
  doge: 'doge',
  dot: 'dot',
  eth: 'eth',
  eure: 'eur',
  gbpe: 'gbp',
  link: 'link',
  ltc: 'ltc',
  matic: 'matic',
  near: 'near',
  pol: 'matic',
  sol: 'sol',
  ton: 'ton',
  trx: 'trx',
  uni: 'uni',
  usdc: 'usdc',
  usdce: 'usdc',
  usde: 'usde',
  usdt: 'usdt',
  wco: 'wco',
  xmr: 'xmr',
  xrp: 'xrp',
};

/** `/icons/crypto/usdt.svg` for a known symbol, otherwise `null`. */
export function cryptoIcon(symbol: string): string | null {
  const file = CRYPTO_FILES[symbol.toLowerCase().trim()];
  return file ? `/icons/crypto/${file}.svg` : null;
}

/** network name (lowercase) -> file basename under `public/icons/networks/`. */
const NETWORK_FILES: Record<string, string> = {
  arbitrum: 'arbitrum',
  avalanche: 'avalanche',
  base: 'base',
  bitcoin: 'bitcoin',
  'bnb chain': 'bsc',
  bsc: 'bsc',
  cardano: 'cardano',
  cosmos: 'cosmos',
  dogecoin: 'dogecoin',
  eth: 'ethereum',
  ethereum: 'ethereum',
  litecoin: 'litecoin',
  optimism: 'optimism',
  plasma: 'plasma',
  polkadot: 'polkadot',
  polygon: 'polygon',
  scroll: 'scroll',
  sol: 'solana',
  solana: 'solana',
  tron: 'tron',
  'w chain': 'w-chain',
  xrp: 'xrp',
  'xrp ledger': 'xrp',
};

/** `/icons/networks/ethereum.svg` for a known chain, otherwise `null`. */
export function networkIcon(name: string): string | null {
  const file = NETWORK_FILES[name.toLowerCase().trim()];
  return file ? `/icons/networks/${file}.svg` : null;
}
