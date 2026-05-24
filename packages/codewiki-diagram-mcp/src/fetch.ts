import { getLocalOrigin } from "./local-server.js";

const HOSTED_ORIGIN =
  process.env.CODEWIKI_DATA_ORIGIN?.replace(/\/+$/, "") ||
  "https://app.atelier-inc.net";

const TTL_MS = 60_000;

interface CacheEntry {
  data: unknown;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

export async function fetchJson<T = unknown>(path: string): Promise<T> {
  const cleanPath = path.replace(/^\/+/, "");
  const cacheKey = cleanPath;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }

  // Try local server first (if open_viewer has started one)
  const localOrigin = getLocalOrigin();
  if (localOrigin) {
    try {
      const localUrl = `${localOrigin}/${cleanPath}`;
      const res = await fetch(localUrl, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = (await res.json()) as T;
        cache.set(cacheKey, { data, expiry: Date.now() + TTL_MS });
        return data;
      }
    } catch {
      // local miss — fall through to hosted
    }
  }

  // Fall back to hosted origin
  const hostedUrl = `${HOSTED_ORIGIN}/${cleanPath}`;
  const res = await fetch(hostedUrl);
  if (!res.ok) {
    throw new Error(`GET ${hostedUrl} -> ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  cache.set(cacheKey, { data, expiry: Date.now() + TTL_MS });
  return data;
}

export function getDataOrigin(): string {
  return getLocalOrigin() || HOSTED_ORIGIN;
}
