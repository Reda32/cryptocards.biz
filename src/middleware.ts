import { defineMiddleware } from 'astro:middleware';
import { hasValidSession } from '@/lib/admin/auth';

const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.startsWith('/admin/');

export const onRequest = defineMiddleware(async (context, next) => {
  if (!isAdminPath(context.url.pathname)) return next();

  if (context.url.pathname !== '/admin/login' && !hasValidSession(context.cookies)) {
    return context.redirect('/admin/login', 303);
  }

  const response = await next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'same-origin');
  return response;
});
