import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import itemsHandler from "../../../pages/api/menu/items/index.js";
import pricelistsHandler from "../../../pages/api/menu/pricelists/index.js";
import categoriesHandler from "../../../pages/api/menu/categories/index.js";
import { getAdminToken, bearer } from "../setup/helpers.js";

let token: string;
let pricelistId: number;
let categoryId: number;

beforeAll(async () => {
  token = await getAdminToken();

  // Create a category to use for items
  await testApiHandler({
    pagesHandler: categoriesHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E2E Items Category",
          code: "E2E_ITEMS_CAT",
          status: "active",
        }),
      });
      if (res.status === 201) {
        const data = await res.json();
        categoryId = data.id;
      }
    },
  });

  // Create a pricelist to associate items with
  await testApiHandler({
    pagesHandler: pricelistsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E2E Items Pricelist",
          code: "E2E_ITEMS_PL",
        }),
      });
      if (res.status === 201) {
        const data = await res.json();
        pricelistId = data.id;
      }
    },
  });
});

describe("GET /api/menu/items", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: itemsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns a list of items for authenticated user", async () => {
    await testApiHandler({
      pagesHandler: itemsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(token),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
      },
    });
  });
});

describe("POST /api/menu/items", () => {
  it("creates a new item and returns 201", async () => {
    await testApiHandler({
      pagesHandler: itemsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(token), "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "E2E Test Item",
            code: "E2E_ITEM_001",
            categoryId,
            pricelistId,
            price: 150,
            allowNegativeInventory: true,
          }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        expect(data.name).toBe("E2E Test Item");
      },
    });
  });

  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: itemsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "No Auth Item" }),
        });
        expect(res.status).toBe(401);
      },
    });
  });
});
