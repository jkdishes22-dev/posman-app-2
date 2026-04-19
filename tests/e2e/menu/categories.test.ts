import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import categoriesHandler from "../../../pages/api/menu/categories/index.js";
import { getAdminToken, bearer } from "../setup/helpers.js";

let token: string;
const createdIds: number[] = [];

beforeAll(async () => {
  token = await getAdminToken();
});

afterAll(async () => {
  // Clean up created categories via direct DB access if needed
  // For now, categories don't cascade-delete anything critical in tests
});

describe("GET /api/menu/categories", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: categoriesHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns a list of categories for authenticated user", async () => {
    await testApiHandler({
      pagesHandler: categoriesHandler,
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

describe("POST /api/menu/categories", () => {
  it("creates a new category and returns 201", async () => {
    await testApiHandler({
      pagesHandler: categoriesHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(token), "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "E2E Test Category",
            code: "E2E_CAT_001",
            status: "active",
          }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        expect(data.name).toBe("E2E Test Category");
        createdIds.push(data.id);
      },
    });
  });

  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: categoriesHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "No Auth Cat", code: "NOAUTH" }),
        });
        expect(res.status).toBe(401);
      },
    });
  });
});
