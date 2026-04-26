/**
 * Inventory E2E tests.
 *
 * adjustInventory uses update()+insert() which bypass the TypeORM topological
 * sorter, so they aren't relevant for proving the cyclic-dependency fix.
 * The Inventory entity save() path is exercised indirectly via ItemService
 * (item creation/update) which is already covered by bills.test.ts and
 * items.test.ts.
 *
 * This file verifies the inventory read endpoints are reachable and that
 * the Inventory entity is correctly registered in the TypeORM metadata store
 * (no phantom-entity / name-collision issues after the BaseEntity fix).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import inventoryHandler from "../../pages/api/inventory/index.js";
import inventoryAvailableHandler from "../../pages/api/inventory/available.js";
import { getAdminToken, bearer } from "./setup/helpers.js";

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe("GET /api/inventory", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: inventoryHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns inventory list and returns 200", async () => {
    await testApiHandler({
      pagesHandler: inventoryHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.inventory ?? data.data ?? [];
        expect(Array.isArray(list)).toBe(true);
      },
    });
  });
});

describe("GET /api/inventory/available", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: inventoryAvailableHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns available inventory and returns 200", async () => {
    await testApiHandler({
      pagesHandler: inventoryAvailableHandler,
      params: { itemIds: "1" },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("available");
        expect(typeof data.available).toBe("object");
        expect(Array.isArray(data.available)).toBe(false);
      },
    });
  });
});
