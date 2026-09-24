import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Runs on the server (Node adapter). See astro.config.mjs.
export const prerender = false;

export const GET: APIRoute = async ({ params, request, redirect, url }) => {
  const slug = params.slug;
  if (!slug) return new Response('Missing card slug', { status: 400 });

  const cards = await getCollection('cards');
  const card = cards.find((entry) => entry.data.slug === slug || entry.id === slug);
  if (!card) return new Response('Unknown card', { status: 404 });

  // Best-effort analytics; never block or break the redirect.
  void logClick(card.data.slug, request, url);

  return redirect(card.data.referral.url, 302);
};

async function logClick(slug: string, request: Request, url: URL): Promise<void> {
  const endpoint = process.env.UMAMI_URL;
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  if (!endpoint || !websiteId) return;

  try {
    await fetch(`${endpoint.replace(/\/$/, '')}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: websiteId,
          name: 'affiliate-click',
          url: url.pathname,
          data: { card: slug },
          referrer: request.headers.get('referer') ?? '',
          userAgent: request.headers.get('user-agent') ?? '',
        },
      }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    /* ignore analytics failures */
  }
}
