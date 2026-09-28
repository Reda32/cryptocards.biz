import type { Card } from './cards';

export type Topic = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  filter: (card: Card) => boolean;
};

export const TOPICS: Topic[] = [
  {
    slug: 'no-kyc',
    title: 'Best no-KYC crypto cards',
    description:
      'Crypto cards that let you get started without uploading an identity document, ranked by our editorial score.',
    intro:
      'Some crypto cards let you open an account and issue a virtual card without a passport or selfie. Limits are usually lower until you verify, but they are the fastest way to start spending crypto.',
    filter: (card) => {
      const level = card.data.kyc?.level;
      return level === 'none' || level === 'basic';
    },
  },
  {
    slug: 'bitcoin',
    title: 'Best crypto cards that support Bitcoin',
    description:
      'Crypto cards that let you spend Bitcoin, compared on fees, limits and KYC requirements.',
    intro:
      'These cards accept Bitcoin top-ups, so you can spend BTC wherever the card is accepted. Check the FX fee and the networks supported before committing.',
    filter: (card) => card.data.cryptos.some((crypto) => crypto.symbol === 'BTC'),
  },
  {
    slug: 'no-fee',
    title: 'Best no-fee crypto cards',
    description:
      'Crypto cards with no monthly fee, compared on issuance cost, FX markup and limits.',
    intro:
      'A card with no monthly fee keeps your running costs predictable. Watch the issuance fee, the FX markup and any ATM charges that sit behind the headline number.',
    filter: (card) => card.data.fees?.monthly === 0,
  },
  {
    slug: 'cashback',
    title: 'Best crypto cards with cashback',
    description:
      'Crypto cards that pay cashback or rewards on your spending, ranked by our editorial score.',
    intro:
      'Cashback cards return a percentage of your spending, usually paid in crypto or stablecoins. Rates move with promotions, so verify the current rate before you rely on it.',
    filter: (card) => {
      const cashback = card.data.rewards?.cashback;
      return Boolean(cashback) && cashback !== 'None';
    },
  },
  {
    slug: 'virtual',
    title: 'Best virtual crypto cards',
    description:
      'Virtual crypto cards you can issue instantly and add to Apple Pay or Google Pay.',
    intro:
      'Virtual cards are issued in-app and can be used online or through a mobile wallet straight away, with no shipping time.',
    filter: (card) => card.data.type.includes('virtual'),
  },
  {
    slug: 'stablecoin',
    title: 'Best stablecoin cards',
    description:
      'Crypto cards built around USDT and USDC, compared on fees, limits and KYC.',
    intro:
      'Stablecoin cards convert USDT or USDC into spendable balance, so your purchasing power does not swing with the market.',
    filter: (card) =>
      card.data.cryptos.some((crypto) => crypto.symbol === 'USDT' || crypto.symbol === 'USDC'),
  },
];

export function topicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}

export function topicsForCards(cards: Card[]): { topic: Topic; matches: Card[] }[] {
  return TOPICS.map((topic) => ({ topic, matches: cards.filter(topic.filter) })).filter(
    (entry) => entry.matches.length > 0,
  );
}
