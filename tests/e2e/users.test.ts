import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import usersHandler from "../../pages/api/users/index.js";
import meHandler from "../../pages/api/users/me.js";
import { getAdminToken, bearer } from "./setup/helpers.js";

let token: string;

beforeAll(async () => {
  token = await getAdminToken();
});

describe("GET /api/users", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: usersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns a list of users for authenticated user", async () => {
    await testApiHandler({
      pagesHandler: usersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(token),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        // getUsersHandler returns paginated { users, total } shape
        const users = Array.isArray(data) ? data : data.users ?? [];
        expect(users.length).toBeGreaterThan(0);
      },
    });
  });
});

describe("POST /api/users", () => {
  it("creates a new user and returns 201", async () => {
    await testApiHandler({
      pagesHandler: usersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { ...bearer(token), "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "e2e_testuser",
            password: "testpass123",
            firstName: "E2E",
            lastName: "Testuser",
          }),
        });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        expect(data.username).toBe("e2e_testuser");
      },
    });
  });

  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: usersHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "noauth", password: "pass" }),
        });
        expect(res.status).toBe(401);
      },
    });
  });
});

describe("GET /api/users/me", () => {
  it("returns 401 without auth token", async () => {
    await testApiHandler({
      pagesHandler: meHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns the authenticated user profile", async () => {
    await testApiHandler({
      pagesHandler: meHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: bearer(token),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.username).toBe("admin");
      },
    });
  });
});
