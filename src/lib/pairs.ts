import { pairKey } from './types';

/**
 * Curated head-to-head pages. Add a pair here only when it targets a real
 * search query and can carry unique content (see plan section 8 "avoid page
 * bloat"). The order of `a`/`b` defines the canonical URL.
 */
export type CuratedPair = { a: string; b: string };

export const CURATED_PAIRS: CuratedPair[] = [
  { a: 'redotpay-card', b: 'kast-card' },
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
