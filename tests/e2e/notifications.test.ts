import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import notificationsHandler from "../../pages/api/notifications/index.js";
import markReadHandler from "../../pages/api/notifications/mark-read.js";
import { getAdminToken, bearer } from "./setup/helpers.js";

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe("GET /api/notifications", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: notificationsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns notifications list (may be empty) and returns 200", async () => {
    await testApiHandler({
      pagesHandler: notificationsHandler,
      params: { userId: "1" },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(adminToken),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.notifications ?? data.data ?? [];
        expect(Array.isArray(list)).toBe(true);
      },
    });
  });
});

describe("POST /api/notifications/mark-read", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: markReadHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns 400 when required fields are missing", async () => {
    await testApiHandler({
      pagesHandler: markReadHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(adminToken), "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
      },
    });
  });
});
