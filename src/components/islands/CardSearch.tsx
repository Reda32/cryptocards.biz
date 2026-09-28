import { useEffect, useMemo, useState } from 'preact/hooks';
import { readPayload } from '@/stores/compare';
import type { CompareCard } from '@/lib/types';

export default function CardSearch() {
  const [cards, setCards] = useState<CompareCard[]>([]);
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setCards(readPayload().cards);
  }, []);

  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (query.length === 0) return [];
    return cards
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query),
      )
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
      .slice(0, 8);
  }, [query, cards]);

  const showResults = focused && query.length > 0;

  return (
    <div class="relative w-full max-w-xl">
      <span
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="search"
        value={q}
        placeholder={`Search ${cards.length || ''} crypto cards…`.replace(/\s+/g, ' ')}
        aria-label="Search crypto cards"
        autocomplete="off"
        class="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />

      {showResults && (
        <ul class="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {results.length > 0 ? (
            results.map((card) => (
              <li key={card.slug}>
                <a
                  href={`/cards/${card.slug}`}
                  class="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {card.logo ? (
                    <img
                      src={card.logo}
                      alt=""
                      width={28}
                      height={28}
                      class="h-7 w-7 shrink-0 rounded object-contain ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                  ) : (
                    <span
                      class="grid h-7 w-7 shrink-0 place-items-center rounded text-[10px] font-bold text-white"
                      style={`background:${card.brandColor ?? '#1f42f5'}`}
                    >
                      {card.name[0]}
                    </span>
                  )}
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium text-slate-900 dark:text-white">
                      {card.name}
                    </span>
                    <span class="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {card.company}
                      {card.rating != null ? ` · ${card.rating.toFixed(1)}/10` : ''}
                    </span>
                  </span>
                </a>
              </li>
            ))
          ) : (
            <li class="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
              No cards match “{q}”.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
