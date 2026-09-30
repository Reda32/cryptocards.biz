#!/usr/bin/env node
/**
 * Generate short, factual pros/cons and an FAQ for imported cards that lack
 * them, derived from their already-scraped fees/limits/KYC/rewards.
 *
 * Editorial prose is written by us (never copied from a source). Only fills
 * cards with no pros/cons (curated cards are left untouched).
 *
 * Usage: node scripts/generate-card-copy.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/content/cards');

const usd = (n) => (n === 0 ? 'free' : `US$${n}`);

function buildPros(c) {
  const pros = [];
  const f = c.fees ?? {};
  if (f.monthly === 0) pros.push('No monthly fee');
  if (f.issuance === 0) pros.push('Free card issuance');
  if (f.fx === 0) pros.push('No foreign-exchange markup on spending');
  if (c.type?.includes('physical') && c.type?.includes('virtual'))
    pros.push('Both virtual and physical cards');
  else if (c.type?.includes('virtual')) pros.push('Instant virtual card');
  if (c.wallets?.includes('apple') && c.wallets?.includes('google'))
    pros.push('Supports Apple Pay and Google Pay');
  if (c.rewards?.cashback)
    pros.push(`${c.rewards.cashback} cashback${c.rewards.cashbackToken ? ` in ${c.rewards.cashbackToken}` : ''}`);
  if (c.kyc?.level === 'none') pros.push('No identity verification required');
  else if (c.kyc?.level === 'basic') pros.push('Light-touch verification to get started');
  if (/unlimited/i.test(c.limits?.dailySpend ?? '')) pros.push('High daily spending limits');
  return pros.slice(0, 6);
}

function buildCons(c) {
  const cons = [];
  const f = c.fees ?? {};
  if (typeof f.monthly === 'number' && f.monthly > 0) cons.push(`US$${f.monthly} monthly fee`);
  if (typeof f.fx === 'number' && f.fx > 0) cons.push(`${f.fx}% foreign-exchange markup`);
  if (typeof f.issuance === 'number' && f.issuance > 0) cons.push(`US$${f.issuance} card issuance fee`);
  if (f.atm && !/free|^0/i.test(f.atm)) cons.push(`ATM fees apply (${f.atm})`);
  if (c.kyc?.level === 'id') cons.push('Identity verification (KYC) required');
  if (c.kyc?.level === 'full') cons.push('Full KYC, including proof of address, required');
  if (c.type && c.type.length > 0 && !c.type.includes('physical'))
    cons.push('Virtual card only, no physical card');
  if (c.rewards?.cashbackToken && !c.rewards?.cashback)
    cons.push('Rewards programme details are limited');
  return cons.slice(0, 6);
}

function buildFaq(c) {
  const faq = [];
  const f = c.fees ?? {};
  const monthly =
    f.monthly === 0
      ? 'No. There is no monthly fee.'
      : typeof f.monthly === 'number'
        ? `Yes. It charges US$${f.monthly} per month.`
        : 'The provider has not clearly published its monthly fee.';
  const issuanceNote =
    typeof f.issuance === 'number' ? ` Card issuance is ${usd(f.issuance)}.` : '';
  faq.push({
    question: `Does the ${c.name} charge a monthly fee?`,
    answer: `${monthly}${issuanceNote}`,
  });

  faq.push({
    question: `What are the foreign-exchange fees on the ${c.name}?`,
    answer:
      typeof f.fx === 'number'
        ? f.fx === 0
          ? 'There is no foreign-exchange markup on spending.'
          : `It charges about ${f.fx}% on non-base-currency spending.`
        : 'Foreign-exchange fees have not been clearly published.',
  });

  if (c.kyc) {
    const labels = { none: 'no verification', basic: 'email/phone verification', id: 'a government ID', full: 'a government ID plus proof of address' };
    faq.push({ question: `What KYC does the ${c.name} require?`, answer: `It requires ${labels[c.kyc.level] ?? 'verification'}.` });
  }

  faq.push({
    question: `Which card network and wallets does the ${c.name} support?`,
    answer: `${c.network === 'visa' ? 'Visa' : c.network === 'mastercard' ? 'Mastercard' : 'The card network is not confirmed'}${
      c.wallets?.length ? `, with ${c.wallets.map((w) => (w === 'apple' ? 'Apple Pay' : 'Google Pay')).join(' and ')}` : ''
    }.`,
  });

  return faq;
}

let updated = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const path = join(dir, file);
  const c = JSON.parse(readFileSync(path, 'utf8'));
  const hasPros = Array.isArray(c.pros) && c.pros.length > 0;
  const hasFaq = Array.isArray(c.faq) && c.faq.length > 0;
  if (hasPros && hasFaq) continue;

  if (!hasPros) {
    c.pros = buildPros(c);
    c.cons = buildCons(c);
  }
  if (!hasFaq) c.faq = buildFaq(c);

  writeFileSync(path, `${JSON.stringify(c, null, 2)}\n`);
  updated++;
}
console.log(`updated ${updated} cards with pros/cons + FAQ`);
