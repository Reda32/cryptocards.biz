import { getCollection, type CollectionEntry } from 'astro:content';
import type { CompareCard } from './types';

export * from './types';

export type Card = CollectionEntry<'cards'>;
export type Community = CollectionEntry<'community'>;
export type Review = CollectionEntry<'reviews'>;

export async function getAllCards(): Promise<Card[]> {
  const cards = await getCollection('cards');
  return cards.sort((a, b) => b.data.rating - a.data.rating);
}

export async function getCommunityForCard(slug: string): Promise<Community | null> {
  const all = await getCollection('community');
  return all.find((c) => c.data.cardSlug === slug) ?? null;
}

export async function getReviewForCard(slug: string): Promise<Review | null> {
  const all = await getCollection('reviews');
  return all.find((r) => r.data.cardSlug === slug) ?? null;
}

export async function getAllCommunities(): Promise<Community[]> {
  return getCollection('community');
}

export function toCompareCard(card: Card, communityScore: number | null): CompareCard {
  const d = card.data;
  return {
    slug: d.slug,
    name: d.name,
    company: d.company,
    logo: d.logo,
    brandColor: d.brandColor,
    network: d.network,
    type: d.type,
    wallets: d.wallets,
    features: d.features,
    rating: d.rating,
    fees: d.fees,
    limits: d.limits,
    rewards: d.rewards,
    kyc: d.kyc,
    cryptos: d.cryptos,
    countries: d.countries,
    referral: { code: d.referral.code, url: d.referral.url },
    communityScore,
  };
}

export async function getCompareCards(): Promise<CompareCard[]> {
  const [cards, communities] = await Promise.all([getAllCards(), getAllCommunities()]);
  return cards.map((card) => {
    const community = communities.find((c) => c.data.cardSlug === card.data.slug) ?? null;
    return toCompareCard(card, community?.data.score ?? null);
  });
}
