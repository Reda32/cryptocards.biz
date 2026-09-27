import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  MAX_COMPARE,
  KYC_LABELS,
  percent,
  usd,
  type CompareCard,
  type KycLevel,
} from '@/lib/types';
import {
  clearSlugs,
  readPayload,
  resolveCards,
  selectedSlugs,
  setSlugs,
  toggleSlug,
} from '@/stores/compare';
import { cryptoIcon } from '@/lib/icons';

type Tone = 'good' | 'warn' | 'bad';
type Cell = { text: string; sort?: number | null; tone?: Tone; icons?: string[] };
type Row = { label: string; best?: 'high' | 'low'; cell: (c: CompareCard) => Cell };

const KYC_RANK: Record<KycLevel, number> = { none: 0, basic: 1, id: 2, full: 3 };

function parseLimit(value: string): number {
  if (/unlimited/i.test(value)) return Number.POSITIVE_INFINITY;
  const match = value.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

const ROWS: Row[] = [
  {
    label: 'Overall score',
    best: 'high',
    cell: (c) => ({
      text: c.rating.toFixed(1),
      sort: c.rating,
      tone: c.rating >= 8 ? 'good' : c.rating >= 6.5 ? 'warn' : 'bad',
    }),
  },
  {
    label: 'Community score',
    best: 'high',
    cell: (c) => ({
      text: c.communityScore !== null ? c.communityScore.toFixed(1) : 'Not enough data',
      sort: c.communityScore,
    }),
  },
  { label: 'Network', cell: (c) => ({ text: c.network === 'visa' ? 'Visa' : 'Mastercard' }) },
  {
    label: 'Card type',
    cell: (c) => ({
      text: c.type.map((t) => (t === 'virtual' ? 'Virtual' : 'Physical')).join(' + '),
    }),
  },
  {
    label: 'Mobile wallets',
    cell: (c) => ({
      text:
        c.wallets.length === 0
          ? 'None'
          : c.wallets
              .map((w) => (w === 'apple' ? 'Apple Pay' : 'Google Pay'))
              .join(', '),
    }),
  },
  {
    label: 'KYC level',
    best: 'low',
    cell: (c) => ({
      text: KYC_LABELS[c.kyc.level],
      sort: KYC_RANK[c.kyc.level],
      tone: c.kyc.level === 'none' ? 'good' : c.kyc.level === 'full' ? 'bad' : 'warn',
    }),
  },
  {
    label: 'Issuance fee',
    best: 'low',
    cell: (c) => ({ text: usd(c.fees.issuance), sort: c.fees.issuance }),
  },
  {
    label: 'Monthly fee',
    best: 'low',
    cell: (c) => ({ text: usd(c.fees.monthly), sort: c.fees.monthly }),
  },
  {
    label: 'FX markup',
    best: 'low',
    cell: (c) => ({ text: percent(c.fees.fx), sort: c.fees.fx }),
  },
  { label: 'ATM fee', cell: (c) => ({ text: c.fees.atm }) },
  {
    label: 'Daily spend',
    best: 'high',
    cell: (c) => ({ text: c.limits.dailySpend, sort: parseLimit(c.limits.dailySpend) }),
  },
  {
    label: 'Monthly spend',
    best: 'high',
    cell: (c) => ({ text: c.limits.monthlySpend, sort: parseLimit(c.limits.monthlySpend) }),
  },
  {
    label: 'Cryptocurrencies',
    best: 'high',
    cell: (c) => ({
      text: c.cryptos.map((x) => x.symbol).join(', ') || '—',
      sort: c.cryptos.length,
      icons: c.cryptos
        .map((x) => cryptoIcon(x.symbol))
        .filter((icon): icon is string => Boolean(icon)),
    }),
  },
  {
    label: 'Countries',
    best: 'high',
    cell: (c) => ({ text: `${c.countries.length} supported`, sort: c.countries.length }),
  },
  {
    label: 'Cashback',
    cell: (c) => ({ text: c.rewards.cashback ?? 'None' }),
  },
];

function toneClass(tone?: Tone): string {
  if (tone === 'good') return 'text-emerald-700 dark:text-emerald-400 font-medium';
  if (tone === 'bad') return 'text-rose-700 dark:text-rose-400 font-medium';
  if (tone === 'warn') return 'text-amber-700 dark:text-amber-400';
  return '';
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      class="inline-flex items-center gap-1 rounded border border-dashed border-slate-300 px-2 py-0.5 font-mono text-xs hover:border-brand-400 dark:border-slate-600"
      title="Copy code"
    >
      {code}
      <span class="text-slate-400">{copied ? '✓' : '⧉'}</span>
    </button>
  );
}

export default function CompareTable() {
  const [mounted, setMounted] = useState(false);
  const [cards, setCards] = useState<CompareCard[]>([]);
  const [diffOnly, setDiffOnly] = useState(false);
  const slugs = useStore(selectedSlugs);

  useEffect(() => {
    const payload = readPayload();
    setCards(payload.cards);
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('cards');
    if (fromUrl) {
      setSlugs(
        fromUrl
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
    setMounted(true);
  }, []);

  // Keep the URL shareable.
  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    if (slugs.length > 0) params.set('cards', slugs.join(','));
    else params.delete('cards');
    const qs = params.toString();
    history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [slugs, mounted]);

  const selected = useMemo(() => resolveCards(cards, slugs), [cards, slugs]);

  const rows = useMemo(() => {
    const evaluated = ROWS.map((row) => {
      const cells = selected.map(row.cell);
      const texts = cells.map((c) => c.text);
      const isDifferent = new Set(texts).size > 1;
      let bestIndex = -1;
      if (row.best && selected.length > 1) {
        const numeric = cells
          .map((c, i) => ({ i, v: c.sort }))
          .filter((x) => typeof x.v === 'number' && Number.isFinite(x.v));
        if (numeric.length === selected.length) {
          const target =
            row.best === 'high'
              ? Math.max(...numeric.map((x) => x.v as number))
              : Math.min(...numeric.map((x) => x.v as number));
          const winners = numeric.filter((x) => x.v === target).map((x) => x.i);
          if (winners.length === 1) bestIndex = winners[0];
        }
      }
      return { row, cells, isDifferent, bestIndex };
    });
    return diffOnly ? evaluated.filter((r) => r.isDifferent) : evaluated;
  }, [selected, diffOnly]);

  if (!mounted) return null;

  return (
    <div>
      {/* Picker */}
      <div class="card-surface mb-6 p-5">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">
            Select up to {MAX_COMPARE} cards
          </h2>
          {selected.length > 0 && (
            <button
              type="button"
              class="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              onClick={() => clearSlugs()}
            >
              Clear
            </button>
          )}
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          {cards.map((card) => {
            const checked = slugs.includes(card.slug);
            const disabled = !checked && slugs.length >= MAX_COMPARE;
            return (
              <label
                key={card.slug}
                class={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                  checked
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleSlug(card.slug)}
                />
                {card.name}
              </label>
            );
          })}
        </div>
      </div>

      {selected.length < 2 ? (
        <p class="card-surface p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Select at least two cards to see a side-by-side comparison.
        </p>
      ) : (
        <div>
          <label class="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={diffOnly}
              onChange={(e) => setDiffOnly((e.target as HTMLInputElement).checked)}
            />
            Show differences only
          </label>

          <div class="card-surface overflow-x-auto">
            <table class="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800">
                  <th class="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                    Feature
                  </th>
                  {selected.map((card) => (
                    <th class="px-4 py-3 text-left" key={card.slug}>
                      <a
                        href={`/cards/${card.slug}`}
                        class="font-bold text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                      >
                        {card.name}
                      </a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ row, cells, bestIndex }) => (
                  <tr
                    key={row.label}
                    class="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <th class="sticky left-0 z-10 bg-white px-4 py-2.5 text-left font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      {row.label}
                    </th>
                    {cells.map((cell, index) => (
                      <td
                        key={selected[index]?.slug ?? index}
                        class={`px-4 py-2.5 ${
                          index === bestIndex
                            ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : toneClass(cell.tone)
                        }`}
                      >
                        {cell.icons && cell.icons.length > 0 ? (
                          <span class="flex items-center gap-2">
                            <span class="flex shrink-0 -space-x-1">
                              {cell.icons.slice(0, 6).map((src) => (
                                <img
                                  src={src}
                                  alt=""
                                  width={16}
                                  height={16}
                                  loading="lazy"
                                  class="h-4 w-4 rounded-full ring-1 ring-white dark:ring-slate-900"
                                />
                              ))}
                            </span>
                            <span>{cell.text}</span>
                          </span>
                        ) : (
                          cell.text
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th class="sticky left-0 z-10 bg-white px-4 py-3 text-left font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    Referral code
                  </th>
                  {selected.map((card) => (
                    <td class="px-4 py-3" key={card.slug}>
                      <CopyCode code={card.referral.code} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th class="sticky left-0 z-10 bg-white px-4 py-3 text-left font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    Get the card
                  </th>
                  {selected.map((card) => (
                    <td class="px-4 py-3" key={card.slug}>
                      <a
                        href={`/go/${card.slug}`}
                        rel="sponsored nofollow noopener"
                        target="_blank"
                        class="btn-primary"
                      >
                        Get card
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-4 text-xs text-slate-400">
            Best value per row is highlighted. Fees and limits are verified periodically — check the
            provider before applying.
          </p>
        </div>
      )}
    </div>
  );
}
