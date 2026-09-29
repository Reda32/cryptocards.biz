import type { APIRoute } from 'astro';

// First-party Umami analytics proxy. Runs on the Node adapter.
//   GET  /stats/script.js  -> <UMAMI_HOST>/script.js
//   POST /stats/api/send   -> <UMAMI_HOST>/api/send
// Only these two endpoints are proxied, so this cannot be used as an open
// relay. Request cookies/authorization are stripped.
export const prerender = false;

const HOST = process.env.UMAMI_HOST;

// path -> allowed methods
const ALLOWED: Record<string, string[]> = {
  'script.js': ['GET', 'HEAD'],
  'api/send': ['POST'],
};

const MAX_BODY = 64 * 1024; // analytics payloads are small
const cache = new Map<string, { body: ArrayBuffer; status: number; contentType: string | null; at: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export const ALL: APIRoute = async ({ params, request, url }) => {
  if (!HOST) return new Response('Analytics disabled', { status: 404 });

  const path = (params.path ?? '').replace(/\/$/, '');
  const methods = ALLOWED[path];
  if (!methods) return new Response('Not found', { status: 404 });
  if (!methods.includes(request.method)) {
    return new Response('Method not allowed', { status: 405, headers: { allow: methods.join(', ') } });
  }

  const cacheKey = `${path}${url.search}`;
  const isCacheable = path === 'script.js' && request.method === 'GET';
  if (isCacheable) {
    const hit = cache.get(cacheKey);
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

  // Forward the browser headers Umami needs, minus anything sensitive.
  const headers = new Headers(request.headers);
  for (const h of ['host', 'content-length', 'cookie', 'authorization', 'x-forwarded-host']) {
    headers.delete(h);
  }
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp = forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip');
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  const hasBody = request.method === 'POST';
  const body = hasBody ? await request.arrayBuffer() : undefined;
  if (body && body.byteLength > MAX_BODY) {
    return new Response('Payload too large', { status: 413 });
  }

  try {
    const res = await fetch(`${HOST.replace(/\/$/, '')}/${path}${url.search}`, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });

    const outHeaders = new Headers(res.headers);
    outHeaders.delete('content-encoding');
    outHeaders.delete('content-length');

    if (isCacheable) {
      const buffer = await res.arrayBuffer();
      cache.set(cacheKey, {
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
