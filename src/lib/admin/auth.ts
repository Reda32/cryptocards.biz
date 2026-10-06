import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';

export const SESSION_COOKIE = 'cc_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 12;

const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

/** The admin password, or null when it is unset or too weak (admin disabled). */
function adminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD ?? '';
  return password.length >= MIN_PASSWORD_LENGTH ? password : null;
}

export function adminEnabled(): boolean {
  return adminPassword() !== null;
}

/** Changing ADMIN_PASSWORD invalidates every existing session. */
function signingKey(password: string): Buffer {
  return createHash('sha256').update(`cryptocards-admin-session:${password}`).digest();
}

function sign(payload: string, password: string): string {
  return createHmac('sha256', signingKey(password)).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

export function isLockedOut(clientId: string): boolean {
  const entry = failures.get(clientId);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failures.delete(clientId);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

/** Checks the password and records failures for rate limiting. */
export function verifyPassword(candidate: string, clientId: string): boolean {
  const password = adminPassword();
  if (!password) return false;
  if (safeEqual(candidate, password)) {
    failures.delete(clientId);
    return true;
  }
  const entry = failures.get(clientId);
  if (entry && Date.now() <= entry.resetAt) entry.count += 1;
  else failures.set(clientId, { count: 1, resetAt: Date.now() + FAILURE_WINDOW_MS });
  return false;
}

export function startSession(cookies: AstroCookies, secure: boolean): void {
  const password = adminPassword();
  if (!password) return;
  const expiresAt = String(Date.now() + SESSION_TTL_MS);
  cookies.set(SESSION_COOKIE, `${expiresAt}.${sign(expiresAt, password)}`, {
    path: '/admin',
    httpOnly: true,
    sameSite: 'strict',
    secure,
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function endSession(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/admin' });
}

export function hasValidSession(cookies: AstroCookies): boolean {
  const password = adminPassword();
  const value = cookies.get(SESSION_COOKIE)?.value;
  if (!password || !value) return false;
  const [expiresAt, signature] = value.split('.');
  if (!expiresAt || !signature) return false;
  if (!safeEqual(signature, sign(expiresAt, password))) return false;
  return Number(expiresAt) > Date.now();
}
