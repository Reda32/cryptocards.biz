import { persistentAtom } from '@nanostores/persistent';
import { MAX_COMPARE, pairKey, type CompareCard } from '@/lib/types';
import { findCuratedPair } from '@/lib/pairs';

/** The full build-time card payload embedded in every page via #compare-data. */
export type ComparePayload = {
  cards: CompareCard[];
  pairs: string[];
};

/** Selected card slugs, persisted to localStorage across pages. */
export const selectedSlugs = persistentAtom<string[]>('compare:slugs', [], {
  encode: JSON.stringify,
  decode: (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  },
});

/** Resolve the selected slugs against the embedded card payload. */
export function readPayload(): ComparePayload {
  if (typeof document === 'undefined') return { cards: [], pairs: [] };
  const el = document.getElementById('compare-data');
  if (!el?.textContent) return { cards: [], pairs: [] };
  try {
    const parsed = JSON.parse(el.textContent) as Partial<ComparePayload>;
    return { cards: parsed.cards ?? [], pairs: parsed.pairs ?? [] };
  } catch {
    return { cards: [], pairs: [] };
  }
}

export function resolveCards(all: CompareCard[], slugs: string[]): CompareCard[] {
  return slugs
    .map((slug) => all.find((card) => card.slug === slug))
    .filter((card): card is CompareCard => Boolean(card));
}

export function toggleSlug(slug: string): void {
  const current = selectedSlugs.get();
  if (current.includes(slug)) {
    selectedSlugs.set(current.filter((s) => s !== slug));
  } else if (current.length < MAX_COMPARE) {
    selectedSlugs.set([...current, slug]);
  }
}

export function removeSlug(slug: string): void {
  selectedSlugs.set(selectedSlugs.get().filter((s) => s !== slug));
}

export function clearSlugs(): void {
  selectedSlugs.set([]);
}

export function setSlugs(slugs: string[]): void {
  selectedSlugs.set(slugs.slice(0, MAX_COMPARE));
}

/** Destination for the "Compare now" button. */
export function compareHref(slugs: string[]): string {
  if (slugs.length === 2) {
    const pair = findCuratedPair(slugs);
    if (pair) return `/compare/${pairKey(pair.a)}-vs-${pairKey(pair.b)}`;
  }
  if (slugs.length === 0) return '/compare';
  return `/compare?cards=${slugs.join(',')}`;
}
