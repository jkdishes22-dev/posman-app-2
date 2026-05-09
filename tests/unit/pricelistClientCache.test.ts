import { describe, it, expect } from "vitest";
import {
  CLIENT_PRICELIST_CACHE_TTL_MS,
  isClientPricelistCacheFresh,
} from "../../src/app/utils/pricelistClientCache";

describe("pricelistClientCache", () => {
  it("exposes a 5-minute TTL", () => {
    expect(CLIENT_PRICELIST_CACHE_TTL_MS).toBe(5 * 60 * 1000);
  });

  it("reports fresh when inside TTL", () => {
    const now = 1_000_000;
    const fetchedAt = now - 60 * 1000; // 1 minute ago
    expect(isClientPricelistCacheFresh(fetchedAt, now)).toBe(true);
  });

  it("reports stale when older than TTL", () => {
    const now = 1_000_000;
    const fetchedAt = now - CLIENT_PRICELIST_CACHE_TTL_MS - 1;
    expect(isClientPricelistCacheFresh(fetchedAt, now)).toBe(false);
  });

  it("reports stale exactly at TTL boundary", () => {
    const now = 1_000_000;
    const fetchedAt = now - CLIENT_PRICELIST_CACHE_TTL_MS;
    expect(isClientPricelistCacheFresh(fetchedAt, now)).toBe(false);
  });
});
