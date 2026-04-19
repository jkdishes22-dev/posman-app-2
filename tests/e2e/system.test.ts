import { describe, it, expect } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import setupStatusHandler from "../../pages/api/system/setup-status.js";

describe("GET /api/system/setup-status", () => {
  it("returns ready state after migrations have run", async () => {
    await testApiHandler({
      pagesHandler: setupStatusHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        const data = await res.json();
        // After globalSetup runs migrations, the DB should be fully ready
        expect(data.state).toBe("ready");
      },
    });
  });

  it("returns 405 for non-GET methods", async () => {
    await testApiHandler({
      pagesHandler: setupStatusHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(405);
      },
    });
  });
});
