import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import jwt from "jsonwebtoken";
import loginHandler from "../../pages/api/auth/login.js";
import refreshHandler from "../../pages/api/auth/refresh.js";
import licenseStatusHandler from "../../pages/api/system/license-status.js";
import licenseActivateHandler from "../../pages/api/system/license-activate.js";
import licenseDiagnosticsHandler from "../../pages/api/system/license-diagnostics.js";
import { licenseService } from "@backend/licensing/LicenseService";

describe("Licensing API and auth enforcement", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns current license status from status endpoint", async () => {
    vi.spyOn(licenseService, "getStatus").mockResolvedValue({
      state: "ready",
      code: "LICENSE_READY",
      message: "License is valid.",
      expiresAt: null,
      planType: "lifetime",
    });

    await testApiHandler({
      pagesHandler: licenseStatusHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.state).toBe("ready");
        expect(body.code).toBe("LICENSE_READY");
      },
    });
  });

  it("returns deterministic error payload when license backend throws on status endpoint", async () => {
    vi.spyOn(licenseService, "getStatus").mockRejectedValue(
      new Error("Secure license storage is unavailable (keytar load failure)"),
    );

    await testApiHandler({
      pagesHandler: licenseStatusHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.code).toBe("LICENSE_INVALID");
        expect(body.state).toBe("license_invalid");
      },
    });
  });

  it("activates license via activate endpoint", async () => {
    vi.spyOn(licenseService, "activateFromCode").mockResolvedValue({
      state: "ready",
      code: "LICENSE_READY",
      message: "License is valid.",
      expiresAt: null,
      planType: "lifetime",
    });

    await testApiHandler({
      pagesHandler: licenseActivateHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseCode: "mock-code" }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.code).toBe("LICENSE_READY");
      },
    });
  });

  it("blocks login when license is expired", async () => {
    vi.spyOn(licenseService, "getStatus").mockResolvedValue({
      state: "license_expired",
      code: "LICENSE_EXPIRED",
      message: "License has expired.",
      expiresAt: null,
      planType: null,
    });

    await testApiHandler({
      pagesHandler: loginHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "admin123" }),
        });
        expect(res.status).toBe(402);
        const body = await res.json();
        expect(body.code).toBe("LICENSE_EXPIRED");
      },
    });
  });

  it("returns deterministic setup error when license backend throws during login", async () => {
    vi.spyOn(licenseService, "getStatus").mockRejectedValue(
      new Error("Secure license storage is unavailable (keytar load failure)"),
    );

    await testApiHandler({
      pagesHandler: loginHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "admin123" }),
        });
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.message).toBe("Some error occurred. Please try again.");
      },
    });
  });

  it("blocks refresh when license is invalid", async () => {
    vi.spyOn(licenseService, "getStatus").mockResolvedValue({
      state: "license_invalid",
      code: "LICENSE_INVALID",
      message: "License validation failed.",
      expiresAt: null,
      planType: null,
    });

    await testApiHandler({
      pagesHandler: refreshHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { Cookie: "refreshToken=some-token" },
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("LICENSE_INVALID");
      },
    });
  });

  it("denies valid non-admin user on license diagnostics with 403", async () => {
    vi.spyOn(licenseService, "getStatus").mockResolvedValue({
      state: "ready",
      code: "LICENSE_READY",
      message: "License is valid.",
      expiresAt: null,
      planType: "lifetime",
    });
    const token = jwt.sign(
      {
        id: "123",
        user: { firstname: "Sales", lastname: "User" },
        roles: ["sales"],
      },
      process.env.JWT_SECRET || "e2e-test-jwt-secret",
      { expiresIn: "15m" },
    );

    await testApiHandler({
      pagesHandler: licenseDiagnosticsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.message).toBe("Admin access required.");
      },
    });
  });
});
