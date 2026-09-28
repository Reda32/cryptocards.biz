import type { Card } from './cards';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export type CountryGroup = {
  slug: string;
  name: string;
  cards: Card[];
};

export function groupByCountry(cards: Card[]): CountryGroup[] {
  const map = new Map<string, CountryGroup>();
  for (const card of cards) {
    for (const name of card.data.countries) {
      const slug = slugify(name);
      const group = map.get(slug) ?? { slug, name, cards: [] };
      group.cards.push(card);
      map.set(slug, group);
    }
  }
  return [...map.values()]
    .map((group) => ({
      ...group,
      cards: group.cards.sort((a, b) => (b.data.rating ?? -1) - (a.data.rating ?? -1)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type CompanyGroup = {
  slug: string;
  name: string;
  cards: Card[];
};

export function groupByCompany(cards: Card[]): CompanyGroup[] {
  const map = new Map<string, CompanyGroup>();
  for (const card of cards) {
    const slug = slugify(card.data.company);
    const group = map.get(slug) ?? { slug, name: card.data.company, cards: [] };
    group.cards.push(card);
    map.set(slug, group);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
