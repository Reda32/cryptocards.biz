import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * A card variant (Standard / Premium / Founders ...) shown in the
 * "Variants" comparison table on a card page.
 */
const cardVariant = z.object({
  name: z.string(),
  price: z.number().optional(), // one-off issuance price, USD
  rewards: z.string(),
  monthlyFee: z.number(), // USD
  limits: z.string(),
  cardInfo: z.string(), // e.g. "Virtual Visa"
});

const faqItem = z.object({
  question: z.string(),
  answer: z.string(),
});

const cards = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/cards' }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    company: z.string(),
    summary: z.string(),

    // -- presentation (extensions to the original plan schema) --
    logo: z.string().optional(), // path under /public, e.g. /logos/redotpay.svg
    brandColor: z.string().optional(), // hex accent used in the UI

    type: z.array(z.enum(['virtual', 'physical'])),
    network: z.enum(['visa', 'mastercard']),
    wallets: z.array(z.enum(['apple', 'google'])),
    features: z.array(z.string()), // ['contactless', 'staking']

    fees: z.object({
      issuance: z.number(),
      monthly: z.number(),
      fx: z.number(), // percent
      atm: z.string(),
      topup: z.string().optional(),
      decline: z.number().optional(),
    }),
    limits: z.object({
      dailySpend: z.string(), // 'Unlimited' or amount
      monthlySpend: z.string(),
      atmWithdrawal: z.string(),
    }),
    rewards: z.object({
      cashback: z.string().optional(),
      cashbackToken: z.string().optional(),
      welcomeBonus: z.string().optional(),
      referralBonus: z.string().optional(),
    }),

    countries: z.array(z.string()),
    restrictedCountries: z.array(z.string()).default([]),
    availabilityNotes: z.string().optional(),
    cryptos: z.array(
      z.object({
        symbol: z.string(), // 'USDT'
        networks: z.array(z.string()), // ['ETH', 'TRON', 'SOL']
      }),
    ),

    kyc: z.object({
      level: z.enum(['none', 'basic', 'id', 'full']),
      email: z.boolean(),
      phone: z.boolean(),
      idDocument: z.boolean(),
      proofOfAddress: z.boolean(),
      selfie: z.boolean(),
      notes: z.string().optional(),
    }),

    pros: z.array(z.string()).max(6),
    cons: z.array(z.string()).max(6),
    rating: z.number().min(0).max(10), // editorial score

    referral: z.object({
      code: z.string(),
      url: z.url(),
      bonus: z.string(),
      terms: z.string().optional(),
      /** "Ongoing" or an explicit date, shown as validity on the promo page. */
      expiry: z.string().optional(),
      eligibility: z.string().optional(),
      alternatives: z
        .array(z.object({ label: z.string(), url: z.url() }))
        .default([]),
    }),

    /** Ordered steps for the "How to get the card" section. */
    howToGet: z.array(z.string()).default([]),

    // -- extensions to the original plan schema --
    variants: z.array(cardVariant).default([]),
    faq: z.array(faqItem).default([]),

    lastVerified: z.coerce.date(),
  }),
});

const communitySourceName = z.enum([
  'appstore',
  'playstore',
  'trustpilot',
  'reddit',
  'x',
]);

const community = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/community' }),
  schema: z.object({
    // slug must match the card slug; the JSON filename is the entry id
    cardSlug: z.string(),
    score: z.number().nullable(), // 0-10, null = not enough data
    updatedAt: z.coerce.date(),
    sources: z.array(
      z.object({
        name: communitySourceName,
        rawRating: z.number().nullable(), // e.g. 3.8 (stars)
        count: z.number(), // ratings or posts analysed
        score10: z.number(), // normalised, 0-10
        url: z.url(),
      }),
    ),
    categories: z
      .object({
        support: z.number(),
        fees: z.number(),
        reliability: z.number(),
        app: z.number(),
        kycEase: z.number(),
      })
      .partial()
      .optional(),
    summary: z.string(),
  }),
});

/**
 * Long-form editorial body, kept separate from the structured card data.
 * The entry id must match the card slug (e.g. `redotpay-card.mdx`).
 */
const reviews = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/reviews' }),
  schema: z.object({
    cardSlug: z.string(),
    title: z.string(),
  }),
});

export const collections = { cards, community, reviews };
