export interface ReferralInput {
  code: string;
  url: string;
  bonus: string;
  terms: string;
  expiry: string;
  eligibility: string;
  alternatives: string;
}

export interface Referral {
  code: string;
  url: string;
  bonus: string;
  terms?: string;
  expiry?: string;
  eligibility?: string;
  alternatives?: { label: string; url: string }[];
}

const FIELDS = ['code', 'url', 'bonus', 'terms', 'expiry', 'eligibility', 'alternatives'] as const;

export function readReferralForm(form: FormData): ReferralInput {
  const values = Object.fromEntries(
    FIELDS.map((field) => [field, String(form.get(field) ?? '').trim()]),
  );
  return values as unknown as ReferralInput;
}

export function referralToInput(referral: Referral | undefined): ReferralInput {
  return {
    code: referral?.code ?? '',
    url: referral?.url ?? '',
    bonus: referral?.bonus ?? '',
    terms: referral?.terms ?? '',
    expiry: referral?.expiry ?? '',
    eligibility: referral?.eligibility ?? '',
    alternatives: (referral?.alternatives ?? []).map((alt) => `${alt.label} | ${alt.url}`).join('\n'),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Validates the form; returns the referral object or a list of errors. */
export function parseReferral(input: ReferralInput): { referral?: Referral; errors: string[] } {
  const errors: string[] = [];

  if (!input.url) errors.push('Affiliate link is required.');
  else if (!isHttpUrl(input.url)) errors.push('Affiliate link must be a full http(s) URL.');
  if (!input.code) errors.push('Promo / referral code is required.');
  else if (input.code.length > 100) errors.push('Promo code is too long.');
  if (!input.bonus) errors.push('Offer / bonus description is required.');
  else if (input.bonus.length > 300) errors.push('Offer description must be 300 characters or fewer.');
  for (const field of ['terms', 'eligibility', 'expiry'] as const) {
    if (input[field].length > 1000) errors.push(`${field} must be 1000 characters or fewer.`);
  }

  const alternatives: { label: string; url: string }[] = [];
  input.alternatives
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const separator = line.lastIndexOf('|');
      const label = separator > 0 ? line.slice(0, separator).trim() : '';
      const url = separator > 0 ? line.slice(separator + 1).trim() : '';
      if (!label || !isHttpUrl(url)) {
        errors.push(`Alternative offer line ${index + 1} must look like "Label | https://...".`);
      } else {
        alternatives.push({ label, url });
      }
    });

  if (errors.length) return { errors };

  return {
    errors,
    referral: {
      code: input.code,
      url: input.url,
      bonus: input.bonus,
      ...(input.terms ? { terms: input.terms } : {}),
      ...(input.expiry ? { expiry: input.expiry } : {}),
      ...(input.eligibility ? { eligibility: input.eligibility } : {}),
      ...(alternatives.length ? { alternatives } : {}),
    },
  };
}

/**
 * Returns a copy of the card with `referral` replaced (or removed when null),
 * keeping key order stable so the Git diff only shows the edited fields.
 */
export function applyReferral(
  card: Record<string, unknown>,
  referral: Referral | null,
  verifiedToday: boolean,
): Record<string, unknown> {
  const entries = Object.entries(card).filter(([key]) => key !== 'referral' || referral);
  const next: [string, unknown][] = entries.map(([key, value]) =>
    key === 'referral' ? [key, referral] : [key, value],
  );

  if (referral && !('referral' in card)) {
    const ratingIndex = next.findIndex(([key]) => key === 'rating');
    next.splice(ratingIndex === -1 ? next.length : ratingIndex + 1, 0, ['referral', referral]);
  }

  const result = Object.fromEntries(next);
  if (verifiedToday) result.lastVerified = new Date().toISOString().slice(0, 10);
  return result;
}
