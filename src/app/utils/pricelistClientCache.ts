/**
 * Client-side pricelist list cache (see PricelistContext).
 * Exported for unit tests and a single source of truth for TTL rules.
 */

export const CLIENT_PRICELIST_CACHE_TTL_MS = 5 * 60 * 1000;

export function isClientPricelistCacheFresh(fetchedAt: number, nowMs = Date.now()): boolean {
  return nowMs - fetchedAt < CLIENT_PRICELIST_CACHE_TTL_MS;
}
