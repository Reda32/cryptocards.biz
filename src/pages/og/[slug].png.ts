import type { APIRoute, GetStaticPaths } from 'astro';
import { getAllCards } from '@/lib/cards';
import { renderOgPng, truncate } from '@/lib/og';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const cards = await getAllCards();
  return [
    { params: { slug: 'default' } },
    ...cards.map((card) => ({ params: { slug: card.data.slug } })),
  ];
};

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? 'default';

  let title = 'Find the best crypto card';
  let subtitle = 'Independent reviews, fees, limits and side-by-side comparisons.';
  let badge = 'Crypto cards';
  let accent = '#3363ff';

  if (slug !== 'default') {
    const cards = await getAllCards();
    const card = cards.find((entry) => entry.data.slug === slug);
    if (card) {
      title = card.data.name;
      subtitle = truncate(card.data.summary);
      badge = card.data.company;
      accent = card.data.brandColor ?? accent;
    }
  }

  const png = await renderOgPng({ title, subtitle, badge, accent });

  return new Response(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
