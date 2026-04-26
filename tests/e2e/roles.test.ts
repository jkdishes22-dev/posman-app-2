import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import rolesHandler from "../../pages/api/roles/index.js";
import { getAdminToken, bearer } from "./setup/helpers.js";

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe("POST /api/roles", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: rolesHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("creates a role and returns 201", async () => {
    await testApiHandler({
      pagesHandler: rolesHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(adminToken), "Content-Type": "application/json" },
          body: JSON.stringify({ name: "e2e_test_role" }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
      },
    });
  });
});

describe("GET /api/roles", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: rolesHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns roles list", async () => {
    await testApiHandler({
      pagesHandler: rolesHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.roles ?? data.data ?? [];
        expect(list.length).toBeGreaterThan(0);
      },
    });
  });
});
