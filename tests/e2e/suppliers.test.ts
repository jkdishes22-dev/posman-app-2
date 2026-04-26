import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import suppliersHandler from "../../pages/api/suppliers/index.js";
import { getAdminToken, bearer } from "./setup/helpers.js";

let adminToken: string;
let supplierId: number;

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe("POST /api/suppliers", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: suppliersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("creates a supplier and returns 201", async () => {
    await testApiHandler({
      pagesHandler: suppliersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(adminToken), "Content-Type": "application/json" },
          body: JSON.stringify({ name: "E2E Supplier", phone: "0700000001" }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        supplierId = data.id;
      },
    });
  });
});

describe("GET /api/suppliers", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: suppliersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns suppliers list including created supplier", async () => {
    await testApiHandler({
      pagesHandler: suppliersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.suppliers ?? data.data ?? [];
        expect(list.some((s: any) => s.id === supplierId)).toBe(true);
      },
    });
  });
});
