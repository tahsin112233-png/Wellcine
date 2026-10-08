/**
 * Tiny in-memory TTL cache. Single-instance; on Vercel each lambda keeps its
 * own copy (warm lambdas reuse it). Never used for signed stream URLs past
 * their cookie expiry — callers clamp the TTL.
 */
import "server-only";

interface Entry {
  exp: number;
  val: unknown;
}

const GLOBAL_KEY = Symbol.for("well-cinebox.cache");

function store(): Map<string, Entry> {
  const g = globalThis as Record<symbol, unknown>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map<string, Entry>();
  return g[GLOBAL_KEY] as Map<string, Entry>;
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = store().get(key);
  if (!entry) return undefined;
  if (entry.exp <= Date.now()) {
    store().delete(key);
    return undefined;
  }
  return entry.val as T;
}

export function cacheSet(key: string, val: unknown, ttlMs: number): void {
  if (ttlMs <= 0) return;
  store().set(key, { exp: Date.now() + ttlMs, val });
}

export function cacheDel(key: string): void {
  store().delete(key);
}
