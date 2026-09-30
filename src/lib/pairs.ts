import { pairKey } from './types';

/**
 * Curated head-to-head pages. Add a pair here only when it targets a real
 * search query and can carry unique content (see plan section 8 "avoid page
 * bloat"). The order of `a`/`b` defines the canonical URL.
 */
export type CuratedPair = { a: string; b: string };

export const CURATED_PAIRS: CuratedPair[] = [
  { a: 'redotpay-card', b: 'kast-card' },
  { a: 'avici-card', b: 'nexo-card' },
  { a: 'avici-card', b: 'redotpay-card' },
  { a: 'nexo-card', b: 'redotpay-card' },
  { a: 'avici-card', b: 'kast-card' },
  { a: 'nexo-card', b: 'kast-card' },
  { a: 'ether-fi-cash-card', b: 'avici-card' },
  { a: 'ether-fi-cash-card', b: 'nexo-card' },
  { a: 'ether-fi-cash-card', b: 'redotpay-card' },
  { a: 'ether-fi-cash-card', b: 'kast-card' },
  { a: 'gemini-credit-card', b: 'avici-card' },
  { a: 'gemini-credit-card', b: 'nexo-card' },
  { a: 'gemini-credit-card', b: 'redotpay-card' },
  { a: 'gemini-credit-card', b: 'kast-card' },
  { a: 'gemini-credit-card', b: 'ether-fi-cash-card' },
  { a: 'plasma-one-card', b: 'redotpay-card' },
  { a: 'plasma-one-card', b: 'kast-card' },
  { a: 'plasma-one-card', b: 'avici-card' },
  { a: 'plasma-one-card', b: 'nexo-card' },
  { a: 'plasma-one-card', b: 'ether-fi-cash-card' },
  { a: 'plasma-one-card', b: 'gemini-credit-card' },
  { a: 'kosh-card', b: 'redotpay-card' },
  { a: 'kosh-card', b: 'kast-card' },
  { a: 'kosh-card', b: 'avici-card' },
  { a: 'kosh-card', b: 'nexo-card' },
  { a: 'kosh-card', b: 'ether-fi-cash-card' },
  { a: 'kosh-card', b: 'gemini-credit-card' },
  { a: 'kosh-card', b: 'plasma-one-card' },
  { a: 'dpt-visa-card', b: 'redotpay-card' },
  { a: 'dpt-visa-card', b: 'kast-card' },
  { a: 'dpt-visa-card', b: 'nexo-card' },
  { a: 'mine-card', b: 'redotpay-card' },
  { a: 'mine-card', b: 'kast-card' },
  { a: 'mine-card', b: 'avici-card' },
  { a: 'mine-card', b: 'nexo-card' },
  { a: 'mine-card', b: 'ether-fi-cash-card' },
  { a: 'mine-card', b: 'gemini-credit-card' },
  { a: 'mine-card', b: 'plasma-one-card' },
  { a: 'mine-card', b: 'kosh-card' },
];

export function pairSlug(a: string, b: string): string {
  return `${pairKey(a)}-vs-${pairKey(b)}`;
}

export function findCuratedPair(slugs: string[]): CuratedPair | null {
  if (slugs.length !== 2) return null;
  const [x, y] = slugs;
  return (
    CURATED_PAIRS.find(
      (p) => (p.a === x && p.b === y) || (p.a === y && p.b === x),
    ) ?? null
  );
}

export function resolvePairFromSlug(
  slug: string,
): { aSlug: string; bSlug: string } | null {
  const [left, right] = slug.split('-vs-');
  if (!left || !right) return null;
  const pair = CURATED_PAIRS.find(
    (p) => pairKey(p.a) === left && pairKey(p.b) === right,
  );
  return pair ? { aSlug: pair.a, bSlug: pair.b } : null;
}

export function allPairSlugs(): string[] {
  return CURATED_PAIRS.map((p) => pairSlug(p.a, p.b));
}
