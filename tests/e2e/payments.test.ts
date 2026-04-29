import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import billPaymentsHandler from "../../pages/api/bills/[billId]/payments.js";
import checkReferenceHandler from "../../pages/api/payments/check-reference.js";
import billsHandler from "../../pages/api/bills/index.js";
import stationsHandler from "../../pages/api/stations/index.js";
import pricelistsHandler from "../../pages/api/menu/pricelists/index.js";
import categoriesHandler from "../../pages/api/menu/categories/index.js";
import itemsHandler from "../../pages/api/menu/items/index.js";
import { getAdminToken, login, bearer } from "./setup/helpers.js";

let adminToken: string;
let supervisorToken: string;
let billId: number;

beforeAll(async () => {
  adminToken = await getAdminToken();
  supervisorToken = await login("e2e_supervisor_bills", "supervisor123");

  const token = adminToken;

  // --- Station ---
  let stationId: number;
  await testApiHandler({
    pagesHandler: stationsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E Payments Station" }),
      });
      if (res.ok) stationId = (await res.json()).id;
    },
  });

  // --- Pricelist ---
  let pricelistId: number;
  await testApiHandler({
    pagesHandler: pricelistsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E Payments Pricelist", code: "E2E_PAY_PL" }),
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
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E Payments Category", code: "E2E_PAY_CAT", status: "active" }),
      });
      if (res.ok) categoryId = (await res.json()).id;
    },
  });

  // --- Item ---
  let itemId: number;
  await testApiHandler({
    pagesHandler: itemsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E2E Payments Item",
          code: "E2E_PAY_ITEM_001",
          categoryId,
          pricelistId,
          price: 300,
          allowNegativeInventory: true,
        }),
      });
      if (res.ok) itemId = (await res.json()).id;
    },
  });

  // --- Bill ---
  await testApiHandler({
    pagesHandler: billsHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { ...bearer(supervisorToken), "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: stationId,
          user_id: 1,
          total: 300,
          items: [{ item_id: itemId, quantity: 1, price: 300 }],
        }),
      });
      if (res.ok) billId = (await res.json()).id;
    },
  });
});

describe("POST /api/bills/[billId]/payments", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: billPaymentsHandler,
      params: { billId: "1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("adds a payment to the bill and returns 201", async () => {
    await testApiHandler({
      pagesHandler: billPaymentsHandler,
      params: { billId: String(billId) },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(supervisorToken), "Content-Type": "application/json" },
          body: JSON.stringify({ paymentType: "cash", creditAmount: 300 }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.payment).toBeDefined();
        expect(data.payment.id).toBeDefined();
      },
    });
  });
});

describe("POST /api/payments/check-reference", () => {
  it("returns 400 when billId is missing", async () => {
    await testApiHandler({
      pagesHandler: checkReferenceHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(supervisorToken), "Content-Type": "application/json" },
          body: JSON.stringify({ reference: "MPESA-E2E-REF-001" }),
        });
        expect(res.status).toBe(400);
      },
    });
  });
});
