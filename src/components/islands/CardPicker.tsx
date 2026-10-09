import { useMemo, useRef, useState } from 'preact/hooks';
import { MAX_COMPARE, type CompareCard } from '@/lib/types';
import { clearSlugs, removeSlug, toggleSlug } from '@/stores/compare';

function CardMark({ card, size }: { card: CompareCard; size: number }) {
  return card.logo ? (
    <img
      src={card.logo}
      alt=""
      width={size}
      height={size}
      class="shrink-0 rounded object-contain ring-1 ring-slate-200 dark:ring-slate-700"
      style={`width:${size}px;height:${size}px`}
    />
  ) : (
    <span
      class="grid shrink-0 place-items-center rounded text-[10px] font-bold text-white"
      style={`width:${size}px;height:${size}px;background:${card.brandColor ?? '#1f42f5'}`}
    >
      {card.name[0]}
    </span>
  );
}

/** Search-and-add picker for the compare tool (replaces listing every card). */
export default function CardPicker({ cards, selected }: { cards: CompareCard[]; selected: CompareCard[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const full = selected.length >= MAX_COMPARE;
  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    const chosen = new Set(selected.map((card) => card.slug));
    return cards
      .filter((card) => !chosen.has(card.slug))
      .filter(
        (card) =>
          !query ||
          card.name.toLowerCase().includes(query) ||
          card.company.toLowerCase().includes(query),
      )
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
      .slice(0, 8);
  }, [cards, selected, query]);

  const add = (card: CompareCard) => {
    toggleSlug(card.slug);
    setQ('');
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const card = results[active];
      if (card && !full) add(card);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && !full;

  return (
    <div class="card-surface mb-6 p-5" data-card-picker>
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white">
          Select up to {MAX_COMPARE} cards{' '}
          <span class="font-normal text-slate-400">
            ({selected.length}/{MAX_COMPARE})
          </span>
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

      {selected.length > 0 && (
        <ul class="mt-3 flex flex-wrap gap-2">
          {selected.map((card) => (
            <li
              key={card.slug}
              class="inline-flex max-w-full items-center gap-2 rounded-lg border border-brand-500 bg-brand-50 py-1 pl-2 pr-1 text-sm text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
            >
              <CardMark card={card} size={20} />
              <span class="truncate">{card.name}</span>
              <button
                type="button"
                class="grid h-6 w-6 shrink-0 place-items-center rounded hover:bg-brand-100 dark:hover:bg-brand-900/60"
                aria-label={`Remove ${card.name}`}
                onClick={() => removeSlug(card.slug)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div class="relative mt-3">
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
          ref={inputRef}
          type="search"
          value={q}
          disabled={full}
          placeholder={
            full
              ? `Maximum ${MAX_COMPARE} cards selected. Remove one to add another.`
              : `Search ${cards.length} cards to add…`
          }
          aria-label="Search cards to compare"
          aria-expanded={showList}
          aria-controls="card-picker-results"
          role="combobox"
          autocomplete="off"
          class="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-900/50"
          onInput={(event) => {
            setQ((event.target as HTMLInputElement).value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />

        {showList && (
          <ul
            id="card-picker-results"
            role="listbox"
            class="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            {!query && (
              <li role="presentation" class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Top rated
              </li>
            )}
            {results.length > 0 ? (
              results.map((card, index) => (
                <li key={card.slug} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    class={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                      index === active ? 'bg-slate-100 dark:bg-slate-800' : ''
                    } hover:bg-slate-100 dark:hover:bg-slate-800`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => add(card)}
                  >
                    <CardMark card={card} size={28} />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-slate-900 dark:text-white">
                        {card.name}
                      </span>
                      <span class="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {card.company}
                        {card.rating != null ? ` · ${card.rating.toFixed(1)}/10` : ''}
                      </span>
                    </span>
                    <span class="shrink-0 text-xs font-semibold text-brand-600 dark:text-brand-400">
                      + Add
                    </span>
                  </button>
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
    </div>
  );
}
