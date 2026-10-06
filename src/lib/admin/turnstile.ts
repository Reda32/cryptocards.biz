const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** The cryptocards.biz widget. Site keys are public; the secret stays in env. */
const DEFAULT_SITE_KEY = '0x4AAAAAAFPowtYaDz0qmDoU';
const DEFAULT_HOSTNAMES = 'cryptocards.biz,www.cryptocards.biz';
export const TURNSTILE_ACTION = 'admin-login';

/** Public site key, or null until TURNSTILE_SECRET is set (check disabled). */
export function turnstileSiteKey(): string | null {
  if (!process.env.TURNSTILE_SECRET) return null;
  return process.env.TURNSTILE_SITE_KEY || DEFAULT_SITE_KEY;
}

/** Frontend hostnames siteverify must report. Never include localhost in production. */
function expectedHostnames(): Set<string> {
  return new Set(
    (process.env.TURNSTILE_HOSTNAMES || DEFAULT_HOSTNAMES)
      .split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );
}

/** Verifies the widget token with Cloudflare. Fails closed on any error. */
export async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  const hostnames = expectedHostnames();
  if (!secret || !token || token.length > 2048 || hostnames.size === 0) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const result = (await res.json()) as { success?: boolean; action?: string; hostname?: string };
    return (
      result.success === true &&
      result.action === TURNSTILE_ACTION &&
      hostnames.has(result.hostname ?? '')
    );
  } catch {
    return false;
  }
}
