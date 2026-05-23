import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import preparationsHandler from "../../pages/api/production/preparations/index.js";
import categoriesHandler from "../../pages/api/menu/categories/index.js";
import pricelistsHandler from "../../pages/api/menu/pricelists/index.js";
import itemsHandler from "../../pages/api/menu/items/index.js";
import { getAdminToken, bearer } from "./setup/helpers.js";

let adminToken: string;
let itemId: number;

beforeAll(async () => {
  adminToken = await getAdminToken();

  // --- Pricelist ---
  let pricelistId: number;
  await testApiHandler({
    pagesHandler: pricelistsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E Production Pricelist", code: "E2E_PROD_PL" }),
      });
      if (res.ok) pricelistId = (await res.json()).id;
    },
  });

  // --- Category ---
  let categoryId: number;
  await testApiHandler({
    pagesHandler: categoriesHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E Production Category", code: "E2E_PROD_CAT", status: "active" }),
      });
      if (res.ok) categoryId = (await res.json()).id;
    },
  });

  // --- Sellable item (isStock: false = production item tracked via preparations) ---
  await testApiHandler({
    pagesHandler: itemsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E2E Production Item",
          code: "E2E_PROD_ITEM_001",
          categoryId,
          pricelistId,
          price: 150,
          isStock: false,
          allowNegativeInventory: true,
        }),
      });
      if (res.ok) itemId = (await res.json()).id;
    },
  });
});

describe("POST /api/production/preparations", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: preparationsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("creates a preparation and returns 201", async () => {
    await testApiHandler({
      pagesHandler: preparationsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(adminToken), "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: itemId, quantity_prepared: 10, notes: "E2E test prep" }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
      },
    });
  });
});

describe("GET /api/production/preparations", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: preparationsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns preparations list", async () => {
    await testApiHandler({
      pagesHandler: preparationsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.preparations ?? data.data ?? [];
        expect(list.length).toBeGreaterThan(0);
      },
    });
  });
});
