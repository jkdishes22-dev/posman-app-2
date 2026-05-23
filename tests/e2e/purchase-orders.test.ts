import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import purchaseOrdersHandler from "../../pages/api/purchase-orders/index.js";
import suppliersHandler from "../../pages/api/suppliers/index.js";
import categoriesHandler from "../../pages/api/menu/categories/index.js";
import pricelistsHandler from "../../pages/api/menu/pricelists/index.js";
import itemsHandler from "../../pages/api/menu/items/index.js";
import { getAdminToken, bearer } from "./setup/helpers.js";

let adminToken: string;
let supplierId: number;
let itemId: number;

beforeAll(async () => {
  adminToken = await getAdminToken();

  // --- Supplier (credit_limit defaults to 0 = unlimited) ---
  await testApiHandler({
    pagesHandler: suppliersHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E PO Supplier" }),
      });
      if (res.ok) supplierId = (await res.json()).id;
    },
  });

  // --- Pricelist ---
  let pricelistId: number;
  await testApiHandler({
    pagesHandler: pricelistsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E PO Pricelist", code: "E2E_PO_PL" }),
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
        body: JSON.stringify({ name: "E2E PO Category", code: "E2E_PO_CAT", status: "active" }),
      });
      if (res.ok) categoryId = (await res.json()).id;
    },
  });

  // --- Stock item (isStock: true so it can appear in purchase orders) ---
  await testApiHandler({
    pagesHandler: itemsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E2E PO Item",
          code: "E2E_PO_ITEM_001",
          categoryId,
          pricelistId,
          price: 50,
          isStock: true,
          allowNegativeInventory: true,
        }),
      });
      if (res.ok) itemId = (await res.json()).id;
    },
  });
});

describe("POST /api/purchase-orders", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: purchaseOrdersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("creates a purchase order and returns 201", async () => {
    await testApiHandler({
      pagesHandler: purchaseOrdersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(adminToken), "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: supplierId,
            items: [{ item_id: itemId, quantity_ordered: 10, unit_price: 50 }],
          }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
      },
    });
  });
});

describe("GET /api/purchase-orders", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: purchaseOrdersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns purchase orders list", async () => {
    await testApiHandler({
      pagesHandler: purchaseOrdersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.orders ?? data.data ?? [];
        expect(list.length).toBeGreaterThan(0);
      },
    });
  });
});
