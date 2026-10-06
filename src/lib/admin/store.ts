import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Reads and writes card JSON for the admin panel.
 *
 * Production: commits to GitHub (GITHUB_TOKEN + GITHUB_REPO), so the push
 * triggers a rebuild and every static page picks up the change.
 * Development (`astro dev`) without GitHub config: writes the local file.
 */

export interface CardFile {
  /** Parsed card JSON. */
  data: Record<string, unknown>;
  /** GitHub blob sha used to reject a save over a newer version. */
  sha: string | null;
}

export class StoreError extends Error {}

interface GitHubConfig {
  token: string;
  repo: string;
  branch: string;
  apiUrl: string;
}

function githubConfig(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;
  return {
    token,
    repo,
    branch: process.env.GITHUB_BRANCH || 'main',
    apiUrl: (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, ''),
  };
}

export type StoreMode = 'github' | 'local' | 'none';

export function storeMode(): StoreMode {
  if (githubConfig()) return 'github';
  return import.meta.env.DEV ? 'local' : 'none';
}

export function storeLabel(): string {
  const config = githubConfig();
  if (config) return `GitHub ${config.repo}@${config.branch}`;
  return import.meta.env.DEV ? 'local files (dev only)' : 'not configured';
}

const cardPath = (slug: string) => `src/content/cards/${slug}.json`;

export function serializeCard(data: Record<string, unknown>): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function github(config: GitHubConfig, path: string, init: RequestInit = {}) {
  return fetch(`${config.apiUrl}/repos/${config.repo}/contents/${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'User-Agent': 'cryptocards-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

export async function readCard(slug: string): Promise<CardFile> {
  const config = githubConfig();
  if (config) {
    const res = await github(config, `${cardPath(slug)}?ref=${encodeURIComponent(config.branch)}`);
    if (res.status === 404) throw new StoreError(`${cardPath(slug)} was not found on ${config.branch}.`);
    if (!res.ok) throw new StoreError(`GitHub returned ${res.status} while reading the card.`);
    const body = (await res.json()) as { content: string; sha: string };
    const text = Buffer.from(body.content, 'base64').toString('utf8');
    return { data: JSON.parse(text), sha: body.sha };
  }
  if (import.meta.env.DEV) {
    const text = await readFile(join(process.cwd(), cardPath(slug)), 'utf8');
    return { data: JSON.parse(text), sha: null };
  }
  throw new StoreError('Saving is not configured. Set GITHUB_TOKEN and GITHUB_REPO.');
}

export async function writeCard(
  slug: string,
  data: Record<string, unknown>,
  sha: string | null,
  message: string,
): Promise<void> {
  const content = serializeCard(data);
  const config = githubConfig();
  if (config) {
    const res = await github(config, cardPath(slug), {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch: config.branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (res.status === 409 || res.status === 422) {
      throw new StoreError('The card changed on GitHub since you opened it. Reload and try again.');
    }
    if (!res.ok) throw new StoreError(`GitHub returned ${res.status} while saving the card.`);
    await triggerDeploy();
    return;
  }
  if (import.meta.env.DEV) {
    await writeFile(join(process.cwd(), cardPath(slug)), content, 'utf8');
    return;
  }
  throw new StoreError('Saving is not configured. Set GITHUB_TOKEN and GITHUB_REPO.');
}

/** Optional explicit redeploy (e.g. a Coolify deploy webhook) after a commit. */
async function triggerDeploy(): Promise<void> {
  const url = process.env.DEPLOY_HOOK_URL;
  if (!url) return;
  const token = process.env.DEPLOY_HOOK_TOKEN;
  try {
    await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    // The commit already succeeded; a missed hook only delays the rebuild.
  }
}
