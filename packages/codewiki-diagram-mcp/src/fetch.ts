import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

import { getLocalOrigin } from "./local-server.js";
import { CACHE_BASE, getHostedOrigin } from "./paths.js";

const TTL_MS = 60_000;

interface CacheEntry {
  data: unknown;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

export function clearFetchCache(): void {
  cache.clear();
}

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

  // Fall back to local cache on disk (works even if viewer server is down)
  const cachePath = join(CACHE_BASE, cleanPath);
  try {
    await access(cachePath);
    const data = JSON.parse(await readFile(cachePath, "utf-8")) as T;
    cache.set(cacheKey, { data, expiry: Date.now() + TTL_MS });
    return data;
  } catch {
    // not in cache
  }

  const hostedOrigin = getHostedOrigin();
  const hostedUrl = `${hostedOrigin}/${cleanPath}`;
  const res = await fetch(hostedUrl);
  if (!res.ok) {
    throw new Error(`GET ${hostedUrl} -> ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  cache.set(cacheKey, { data, expiry: Date.now() + TTL_MS });
  return data;
}

export function getDataOrigin(): string {
  return getLocalOrigin() || getHostedOrigin();
}
