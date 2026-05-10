import { describe, it, expect, beforeEach, vi } from "vitest";
import { cache } from "@backend/utils/cache";

beforeEach(() => {
  cache.clear();
});

describe("cache.invalidateMany", () => {
  it("removes all keys matching any of the given patterns", () => {
    cache.set("categories", [1, 2, 3]);
    cache.set("items_pricelist_1", []);
    cache.set("items_station_5", []);
    cache.set("unrelated_key", "keep me");

    cache.invalidateMany(["categories", "items_pricelist_", "items_station_"]);

    expect(cache.get("categories")).toBeNull();
    expect(cache.get("items_pricelist_1")).toBeNull();
    expect(cache.get("items_station_5")).toBeNull();
    expect(cache.get("unrelated_key")).toBe("keep me");
  });

  it("preserves keys that match none of the patterns", () => {
    cache.set("users", []);
    cache.set("stations", []);

    cache.invalidateMany(["categories"]);

    expect(cache.get("users")).toEqual([]);
    expect(cache.get("stations")).toEqual([]);
  });

  it("handles an empty patterns array without removing anything", () => {
    cache.set("items", [1, 2]);

    cache.invalidateMany([]);

    expect(cache.get("items")).toEqual([1, 2]);
  });

  it("uses substring inclusion for matching, same as invalidate()", () => {
    cache.set("inventory_level_42", { qty: 10 });
    cache.set("inventory_stats", { total: 5 });
    cache.set("available_inventory_1,2,3", []);

    cache.invalidateMany(["inventory_level_", "inventory_stats", "available_inventory_"]);

    expect(cache.get("inventory_level_42")).toBeNull();
    expect(cache.get("inventory_stats")).toBeNull();
    expect(cache.get("available_inventory_1,2,3")).toBeNull();
  });

  it("produces the same result as N sequential invalidate() calls", () => {
    const seed = () => {
      cache.set("supplier_balance_1", 100);
      cache.set("supplier_transactions_1", []);
      cache.set("supplier_1", { name: "Acme" });
    };

    // Reference: sequential invalidate()
    seed();
    cache.invalidate("supplier_balance_1");
    cache.invalidate("supplier_transactions_1");
    const afterSequential = {
      balance: cache.get("supplier_balance_1"),
      transactions: cache.get("supplier_transactions_1"),
      supplier: cache.get("supplier_1"),
    };

    cache.clear();

    // Under test: invalidateMany()
    seed();
    cache.invalidateMany(["supplier_balance_1", "supplier_transactions_1"]);
    const afterMany = {
      balance: cache.get("supplier_balance_1"),
      transactions: cache.get("supplier_transactions_1"),
      supplier: cache.get("supplier_1"),
    };

    expect(afterMany).toEqual(afterSequential);
  });

  it("traverses the Map only once regardless of pattern count", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    const keysSpy = vi.spyOn(Map.prototype, "keys");
    keysSpy.mockClear();

    cache.invalidateMany(["a", "b", "c"]);

    expect(keysSpy).toHaveBeenCalledTimes(1);
    keysSpy.mockRestore();
  });

  it("does not delegate to invalidate() for each pattern", () => {
    const invalidateSpy = vi.spyOn(cache, "invalidate");

    cache.set("a", 1);
    cache.set("b", 2);

    cache.invalidateMany(["a", "b"]);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
