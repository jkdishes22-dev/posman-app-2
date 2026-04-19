import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import stationsHandler from "../../pages/api/stations/index.js";
import { getAdminToken, bearer } from "./setup/helpers.js";

let token: string;

beforeAll(async () => {
  token = await getAdminToken();
});

describe("GET /api/stations", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: stationsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns a list of stations for authenticated user", async () => {
    await testApiHandler({
      pagesHandler: stationsHandler,
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

describe("POST /api/stations", () => {
  it("creates a new station and returns 201", async () => {
    await testApiHandler({
      pagesHandler: stationsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(token), "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "E2E Test Station",
          }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        expect(data.name).toBe("E2E Test Station");
      },
    });
  });

  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: stationsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "No Auth Station" }),
        });
        expect(res.status).toBe(401);
      },
    });
  });
});
