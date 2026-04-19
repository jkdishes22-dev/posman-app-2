import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import loginHandler from "../../pages/api/auth/login.js";
import refreshHandler from "../../pages/api/auth/refresh.js";

describe("POST /api/auth/login", () => {
  it("returns 200 and a JWT token for valid credentials", async () => {
    await testApiHandler({
      pagesHandler: loginHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "admin123" }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(typeof data.token).toBe("string");
        expect(data.token.length).toBeGreaterThan(10);
      },
    });
  });

  it("returns 401 for wrong password", async () => {
    await testApiHandler({
      pagesHandler: loginHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "wrongpassword" }),
        });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns 400 when body is missing", async () => {
    await testApiHandler({
      pagesHandler: loginHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(400);
      },
    });
  });

  it("returns 401 for unknown username", async () => {
    await testApiHandler({
      pagesHandler: loginHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "nobody", password: "admin123" }),
        });
        expect(res.status).toBe(401);
      },
    });
  });
});

describe("POST /api/auth/refresh", () => {
  let refreshToken: string;

  beforeAll(async () => {
    // Get a refresh token by logging in
    await testApiHandler({
      pagesHandler: loginHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "admin123" }),
        });
        // Refresh token comes back as a Set-Cookie header
        const setCookie = res.headers.get("set-cookie") ?? "";
        const match = setCookie.match(/refreshToken=([^;]+)/);
        refreshToken = match?.[1] ?? "";
      },
    });
  });

  it("returns 401 when no refresh token cookie is provided", async () => {
    await testApiHandler({
      pagesHandler: refreshHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns 401 for an invalid refresh token", async () => {
    await testApiHandler({
      pagesHandler: refreshHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { Cookie: "refreshToken=invalid-token-value" },
        });
        expect(res.status).toBe(401);
      },
    });
  });
});
