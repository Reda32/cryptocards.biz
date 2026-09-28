import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Runs on the server (Node adapter). See astro.config.mjs.
export const prerender = false;

export const GET: APIRoute = async ({ params, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Missing card slug', { status: 400 });

  const cards = await getCollection('cards');
  const card = cards.find((entry) => entry.data.slug === slug || entry.id === slug);
  const target = card?.data.referral?.url ?? card?.data.signupUrl;
  if (!card || !target) return new Response('Unknown card', { status: 404 });

  // Affiliate clicks are tracked client-side via Umami (data-umami-event on the CTA).
  return redirect(target, 302);
};
