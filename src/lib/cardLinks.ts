/** Parse the optional CARD_LINKS env map (slug -> URL). Fail-safe on bad JSON. */
export function envLinks(): Record<string, string> {
  const raw = process.env.CARD_LINKS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** The CARD_LINKS override for a card, if it is a usable http(s) URL. */
export function envLinkFor(slug: string): string | null {
  const override = envLinks()[slug];
  return typeof override === 'string' && /^https?:\/\//.test(override) ? override : null;
}
