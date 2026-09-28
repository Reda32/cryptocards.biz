import type { APIRoute } from 'astro';

// First-party proxy for self-hosted Umami. Runs on the Node adapter.
// /stats/script.js  -> <UMAMI_HOST>/script.js
// /stats/api/send   -> <UMAMI_HOST>/api/send
export const prerender = false;

const HOST = process.env.UMAMI_HOST;
const cache = new Map<string, { body: ArrayBuffer; status: number; contentType: string | null; at: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export const ALL: APIRoute = async ({ params, request, url }) => {
  if (!HOST) return new Response('Analytics disabled', { status: 404 });

  const path = params.path ?? '';
  const target = `${HOST.replace(/\/$/, '')}/${path}${url.search}`;
  const isCacheable = request.method === 'GET' && path.endsWith('.js');

  if (isCacheable) {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      return new Response(hit.body, {
        status: hit.status,
        headers: {
          'content-type': hit.contentType ?? 'application/javascript',
          'cache-control': 'public, max-age=3600',
        },
      });
    }
  }

  // Forward all browser headers so Umami records accurate session data.
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp = forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip');
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  try {
    const res = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      signal: AbortSignal.timeout(15000),
    });

    const outHeaders = new Headers(res.headers);

    if (isCacheable) {
      const buffer = await res.arrayBuffer();
      cache.set(path, {
        body: buffer,
        status: res.status,
        contentType: res.headers.get('content-type'),
        at: Date.now(),
      });
      outHeaders.set('cache-control', 'public, max-age=3600');
      return new Response(buffer, { status: res.status, headers: outHeaders });
    }

    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: outHeaders });
  } catch {
    return new Response('Analytics proxy error', { status: 502 });
  }
};
