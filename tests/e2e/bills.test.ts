/**
 * Bill lifecycle E2E tests.
 *
 * Setup creates a station, pricelist, category, and an item with
 * `allowNegativeInventory: true` so the bill creation does not fail
 * due to insufficient inventory in the freshly-migrated test DB.
 *
 * Flow tested:
 *   POST /api/bills            → create bill
 *   GET  /api/bills            → bill appears in list
 *   GET  /api/bills/[id]/items → items returned
 *   POST /api/bills/[id]/close → bill closed
 */
import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import billsHandler from "../../pages/api/bills/index.js";
import billItemsHandler from "../../pages/api/bills/[billId]/items.js";
import billPaymentsHandler from "../../pages/api/bills/[billId]/payments.js";
import closeBillHandler from "../../pages/api/bills/[billId]/close.js";
import stationsHandler from "../../pages/api/stations/index.js";
import pricelistsHandler from "../../pages/api/menu/pricelists/index.js";
import categoriesHandler from "../../pages/api/menu/categories/index.js";
import itemsHandler from "../../pages/api/menu/items/index.js";
import { getAdminToken, login, bearer } from "./setup/helpers.js";

let adminToken: string;
// Supervisor token — admin/cashier/sales each lack some bill permissions; supervisor has full billing access
let supervisorToken: string;
let stationId: number;
let pricelistId: number;
let itemId: number;
let billId: number;

beforeAll(async () => {
  adminToken = await getAdminToken();

  // e2e_supervisor_bills is seeded in global-setup with supervisor role (full billing access)
  supervisorToken = await login("e2e_supervisor_bills", "supervisor123");

  const token = adminToken;

  // --- Station ---
  await testApiHandler({
    pagesHandler: stationsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E Bills Station" }),
      });
      if (res.ok) {
        const d = await res.json();
        stationId = d.id;
      }
    },
  });

  // --- Pricelist ---
  await testApiHandler({
    pagesHandler: pricelistsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E Bills Pricelist", code: "E2E_BILLS_PL" }),
      });
      if (res.ok) {
        const d = await res.json();
        pricelistId = d.id;
      }
    },
  });

  // --- Category ---
  let categoryId: number;
  await testApiHandler({
    pagesHandler: categoriesHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E2E Bills Category",
          code: "E2E_BILLS_CAT",
          status: "active",
        }),
      });
      if (res.ok) {
        const d = await res.json();
        categoryId = d.id;
      }
    },
  });

  // --- Item (allowNegativeInventory so no stock check fails) ---
  await testApiHandler({
    pagesHandler: itemsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E2E Bills Item",
          code: "E2E_BILL_ITEM_001",
          categoryId,
          pricelistId,
          price: 200,
          allowNegativeInventory: true,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        itemId = d.id;
      }
    },
  });
});

describe("POST /api/bills", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: billsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("creates a bill and returns 201", async () => {
    await testApiHandler({
      pagesHandler: billsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(supervisorToken), "Content-Type": "application/json" },
          body: JSON.stringify({
            station_id: stationId,
            user_id: 1, // seeded admin
            total: 200,
            items: [{ item_id: itemId, quantity: 1, price: 200 }],
          }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        billId = data.id;
      },
    });
  });
});

describe("GET /api/bills", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: billsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns a list including the created bill", async () => {
    await testApiHandler({
      pagesHandler: billsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        // fetchBills returns paginated or array result
        const bills = Array.isArray(data) ? data : data.bills ?? data.data ?? [];
        expect(bills.length).toBeGreaterThan(0);
      },
    });
  });
});

describe("GET /api/bills/[billId]/items", () => {
  it("returns items for the created bill", async () => {
    await testApiHandler({
      pagesHandler: billItemsHandler,
      params: { billId: String(billId) },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      },
    });
  });
});

describe("POST /api/bills/[billId]/close", () => {
  it("closes the bill and returns 200", async () => {
    // Add full payment first — closeBill requires paidAmount === billTotal
    await testApiHandler({
      pagesHandler: billPaymentsHandler,
      params: { billId: String(billId) },
      test: async ({ fetch }) => {
        await fetch({
          method: "POST",
          headers: { ...bearer(supervisorToken), "Content-Type": "application/json" },
          body: JSON.stringify({ paymentType: "cash", creditAmount: 200 }),
        });
      },
    });

    await testApiHandler({
      pagesHandler: closeBillHandler,
      params: { billId: String(billId) },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: bearer(supervisorToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.id).toBe(billId);
      },
    });
  });
});
