import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { MAX_COMPARE, type CompareCard } from '@/lib/types';
import {
  clearSlugs,
  compareHref,
  readPayload,
  removeSlug,
  resolveCards,
  selectedSlugs,
  toggleSlug,
} from '@/stores/compare';

export default function CompareBar() {
  const [mounted, setMounted] = useState(false);
  const [cards, setCards] = useState<CompareCard[]>([]);
  const slugs = useStore(selectedSlugs);

  // Read the embedded payload; the compare page owns ?cards= URL syncing.
  useEffect(() => {
    const payload = readPayload();
    setCards(payload.cards);
    setMounted(true);
  }, []);

  // Keep every server-rendered checkbox in sync with the store.
  useEffect(() => {
    if (!mounted) return;
    document.querySelectorAll<HTMLInputElement>('input[data-compare-slug]').forEach((input) => {
      const slug = input.dataset.compareSlug ?? '';
      const checked = slugs.includes(slug);
      input.checked = checked;
      input.disabled = !checked && slugs.length >= MAX_COMPARE;
    });
  }, [slugs, mounted]);

  // Delegate change events from the static checkboxes.
  useEffect(() => {
    const onChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement && target.dataset.compareSlug) {
        toggleSlug(target.dataset.compareSlug);
      }
    };
    document.addEventListener('change', onChange);
    return () => document.removeEventListener('change', onChange);
  }, []);

  if (!mounted) return null;

  const selected = resolveCards(cards, slugs);
  // The interactive table already lives on /compare; don't stack the bar there.
  if (selected.length === 0 || window.location.pathname === '/compare') {
    return null;
  }

  const disabled = selected.length < 2;

  return (
    <div class="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div class="container-page flex flex-wrap items-center gap-3 py-3">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Compare ({selected.length}/{MAX_COMPARE})
        </span>
        <ul class="flex flex-1 flex-wrap items-center gap-2">
          {selected.map((card) => (
            <li key={card.slug}>
              <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-sm dark:border-slate-700 dark:bg-slate-900">
                {card.logo ? (
                  <img src={card.logo} alt="" width={18} height={18} class="rounded" />
                ) : (
                  <span
                    class="grid h-[18px] w-[18px] place-items-center rounded text-[10px] font-bold text-white"
                    style={`background:${card.brandColor ?? '#1f42f5'}`}
                  >
                    {card.name[0]}
                  </span>
                )}
                {card.name}
                <button
                  type="button"
                  aria-label={`Remove ${card.name}`}
                  class="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                  onClick={() => removeSlug(card.slug)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          class="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          onClick={() => clearSlugs()}
        >
          Clear
        </button>
        <a
          href={compareHref(slugs)}
          class={`btn-primary ${disabled ? 'pointer-events-none opacity-50' : ''}`}
          aria-disabled={disabled}
        >
          Compare now
        </a>
      </div>
    </div>
  );
}
