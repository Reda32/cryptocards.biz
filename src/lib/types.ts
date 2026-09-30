/**
 * Framework-agnostic types and helpers shared between Astro (server) and
 * Preact islands (client). Keep this module free of `astro:content` imports
 * so it can be bundled into the browser safely.
 */

export type KycLevel = 'none' | 'basic' | 'id' | 'full';
export type CardNetwork = 'visa' | 'mastercard';
export type Wallet = 'apple' | 'google';
export type CardType = 'virtual' | 'physical';

export type Fees = {
  issuance: number;
  monthly: number;
  fx: number;
  atm: string;
  topup?: string;
  decline?: number;
};

export type Limits = {
  dailySpend: string;
  monthlySpend: string;
  atmWithdrawal: string;
};

export type Rewards = {
  cashback?: string;
  cashbackToken?: string;
  welcomeBonus?: string;
  referralBonus?: string;
};

export type KycInfo = {
  level: KycLevel;
  email: boolean;
  phone: boolean;
  idDocument: boolean;
  proofOfAddress: boolean;
  selfie: boolean;
  notes?: string;
};

/** JSON-safe card projection embedded at build time for the compare islands. */
export type CompareCard = {
  slug: string;
  name: string;
  company: string;
  logo?: string;
  brandColor?: string;
  network?: CardNetwork;
  type: CardType[];
  wallets: Wallet[];
  features: string[];
  rating?: number | null;
  fees?: Fees;
  limits?: Limits;
  rewards?: Rewards;
  kyc?: KycInfo;
  cryptos: { symbol: string; networks: string[] }[];
  countries: string[];
  referral?: { code: string; url: string };
  communityScore: number | null;
};

export const MAX_COMPARE = 4;

export const KYC_LABELS: Record<KycLevel, string> = {
  none: 'No KYC',
  basic: 'Basic KYC',
  id: 'ID required',
  full: 'Full KYC',
};

export const KYC_DESCRIPTIONS: Record<KycLevel, string> = {
  none: 'No verification required',
  basic: 'Email and/or phone only',
  id: 'Government ID required',
  full: 'ID plus proof of address and/or selfie',
};

export const FEATURE_LABELS: Record<string, string> = {
  contactless: 'Contactless payments',
  staking: 'Staking rewards',
  'no-annual-fee': 'No annual fee',
  'crypto-topup': 'Crypto top-up',
  'atm-withdrawal': 'ATM withdrawals',
  'multi-currency': 'Multi-currency',
  'app-notifications': 'App notifications',
  'instant-issuance': 'Instant issuance',
  rewards: 'Rewards programme',
};

export function featureLabel(feature: string): string {
  return (
    FEATURE_LABELS[feature] ??
    feature.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function usd(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'N/A';
  if (value === 0) return 'Free';
  return `US$${value.toLocaleString('en-US')}`;
}

export function percent(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'N/A';
  if (value === 0) return '0%';
  return `${value}%`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `redotpay-card` -> `redotpay`, used to build clean `/compare/a-vs-b` URLs. */
export function pairKey(slug: string): string {
  return slug.replace(/-card$/, '');
}
