import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Runs on the server (Node adapter). See astro.config.mjs.
export const prerender = false;

/** Parse the optional CARD_LINKS env map (slug -> URL). Fail-safe on bad JSON. */
function envLinks(): Record<string, string> {
  const raw = process.env.CARD_LINKS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export const GET: APIRoute = async ({ params, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Missing card slug', { status: 400 });

  // 1) Env override (official or affiliate link, no rebuild needed).
  const override = envLinks()[slug];
  if (typeof override === 'string' && /^https?:\/\//.test(override)) {
    return redirect(override, 302);
  }

  // 2) Card data (affiliate referral, else the official provider link).
  const cards = await getCollection('cards');
  const card = cards.find((entry) => entry.data.slug === slug || entry.id === slug);
  const target = card?.data.referral?.url ?? card?.data.signupUrl;
  if (!card || !target) return new Response('Unknown card', { status: 404 });

  // Affiliate clicks are tracked client-side via Umami (data-umami-event on the CTA).
  return redirect(target, 302);
};
