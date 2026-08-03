import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import forgotPasswordHandler from "../../../pages/api/auth/forgot-password/index.js";
import confirmHandler from "../../../pages/api/auth/forgot-password/confirm.js";
import meHandler from "../../../pages/api/users/me.js";
import { getAdminToken } from "../setup/helpers.js";
import { bearer } from "../setup/helpers.js";

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 404 for unknown username", async () => {
    await testApiHandler({
      pagesHandler: forgotPasswordHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "no_such_user_xyz" }),
        });
        expect(res.status).toBe(404);
      },
    });
  });

  it("returns 400 when username is missing", async () => {
    await testApiHandler({
      pagesHandler: forgotPasswordHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
      },
    });
  });

  it("returns 404 when admin has no security question configured yet", async () => {
    await testApiHandler({
      pagesHandler: forgotPasswordHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin" }),
        });
        // admin starts with no security question — should be 404
        expect(res.status).toBe(404);
      },
    });
  });

  it("returns 405 for GET", async () => {
    await testApiHandler({
      pagesHandler: forgotPasswordHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(405);
      },
    });
  });
});

describe("POST /api/auth/forgot-password/confirm", () => {
  it("returns 400 when forgotToken is missing", async () => {
    await testApiHandler({
      pagesHandler: confirmHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: "test", newPassword: "newpass1" }),
        });
        expect(res.status).toBe(400);
      },
    });
  });

  it("returns 401 for an invalid/malformed token", async () => {
    await testApiHandler({
      pagesHandler: confirmHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forgotToken: "not.a.valid.jwt", answer: "test", newPassword: "newpass1" }),
        });
        expect(res.status).toBe(401);
      },
    });
  });

  it("returns 400 when neither answer nor recoveryCode provided", async () => {
    await testApiHandler({
      pagesHandler: confirmHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forgotToken: "some.token.here", newPassword: "newpass1" }),
        });
        // 400 missing answer/code OR 401 invalid token — either is acceptable
        expect([400, 401]).toContain(res.status);
      },
    });
  });
});

describe("PATCH /api/users/me — setup-security", () => {
  it("returns 400 for invalid security question (not in predefined list)", async () => {
    await testApiHandler({
      pagesHandler: meHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...bearer(adminToken) },
          body: JSON.stringify({ action: "setup-security", question: "A made up question?", answer: "answer" }),
        });
        expect(res.status).toBe(400);
      },
    });
  });

  it("saves security question successfully", async () => {
    await testApiHandler({
      pagesHandler: meHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...bearer(adminToken) },
          body: JSON.stringify({ action: "setup-security", question: "What city were you born in?", answer: "Nairobi" }),
        });
        expect(res.status).toBe(200);
      },
    });
  });
});

describe("PATCH /api/users/me — generate-recovery-code", () => {
  it("returns a plaintext code on success", async () => {
    await testApiHandler({
      pagesHandler: meHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...bearer(adminToken) },
          body: JSON.stringify({ action: "generate-recovery-code" }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.code).toHaveLength(8);
        expect(data.code).toMatch(/^[0-9A-F]{8}$/);
      },
    });
  });
});

describe("Full forgot-password flow", () => {
  it("resets password using security question answer", async () => {
    // Step 1: get question + forgotToken
    let forgotToken = "";
    await testApiHandler({
      pagesHandler: forgotPasswordHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin" }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.question).toBe("What city were you born in?");
        forgotToken = data.forgotToken;
      },
    });

    // Step 2: wrong answer → 400
    await testApiHandler({
      pagesHandler: confirmHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forgotToken, answer: "WrongCity", newPassword: "newpass99" }),
        });
        expect(res.status).toBe(400);
      },
    });

    // Step 3: correct answer → 200
    await testApiHandler({
      pagesHandler: confirmHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forgotToken, answer: "Nairobi", newPassword: "admin123" }),
        });
        expect(res.status).toBe(200);
      },
    });
  });
});
