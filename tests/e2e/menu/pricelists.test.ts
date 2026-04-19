import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import pricelistsHandler from "../../../pages/api/menu/pricelists/index.js";
import pricelistItemsHandler from "../../../pages/api/menu/pricelists/[pricelistId]/items.js";
import { getAdminToken, bearer } from "../setup/helpers.js";

let token: string;
let createdPricelistId: number;

beforeAll(async () => {
  token = await getAdminToken();
});

describe("GET /api/menu/pricelists", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: pricelistsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns a list of pricelists for authenticated user", async () => {
    await testApiHandler({
      pagesHandler: pricelistsHandler,
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

describe("POST /api/menu/pricelists", () => {
  it("creates a new pricelist and returns 201", async () => {
    await testApiHandler({
      pagesHandler: pricelistsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(token), "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "E2E Test Pricelist",
            code: "E2E_PL_001",
          }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        expect(data.name).toBe("E2E Test Pricelist");
        createdPricelistId = data.id;
      },
    });
  });

  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: pricelistsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "No Auth Pricelist", code: "NOAUTH_PL" }),
        });
        expect(res.status).toBe(401);
      },
    });
  });
});

describe("GET /api/menu/pricelists/[pricelistId]/items", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: pricelistItemsHandler,
      params: { pricelistId: "1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns items for a pricelist (may be empty)", async () => {
    // Use the pricelist created above; if creation failed fall back to id 1
    const id = createdPricelistId ?? 1;
    await testApiHandler({
      pagesHandler: pricelistItemsHandler,
      params: { pricelistId: String(id) },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(token),
        });
        // 200 with array (empty is fine for a brand-new pricelist)
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
      },
    });
  });
});
