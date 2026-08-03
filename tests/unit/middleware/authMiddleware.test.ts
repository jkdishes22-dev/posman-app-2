import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node-cache", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      del: vi.fn(),
      flushAll: vi.fn(),
    })),
  };
});

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn().mockReturnValue({ id: "42" }),
    decode: vi.fn(),
  },
}));

vi.mock("@backend/service/UserService", () => ({
  UserService: vi.fn().mockImplementation(() => ({
    getUserWithRolesAndPermissions: vi.fn(),
  })),
}));

vi.mock("@backend/licensing/LicenseService", () => ({
  licenseService: {
    getStatus: vi.fn().mockResolvedValue({ state: "ready" }),
  },
}));

import { authMiddleware } from "@backend/middleware/auth";
import { UserService } from "@backend/service/UserService";

const CASHIER_ROLES = [{ name: "cashier" }];
const CASHIER_BASE_PERMS = [
  { name: "can_print" },
  { name: "can_view_bill" },
  { name: "can_close_bill" },
];
const BILLING_PERMS = [
  "can_add_bill", "can_edit_bill", "can_cancel_bill",
  "can_add_bill_item", "can_edit_bill_item", "can_delete_bill_item",
  "can_view_pricelist", "can_view_item", "can_view_category",
];

function buildReq() {
  return {
    headers: { authorization: "Bearer valid.token" },
    db: {
      options: { type: "sqlite" },
      query: vi.fn(),
    },
    user: undefined as any,
  };
}

function buildRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function mockUserService(roles: any[], permissions: any[]) {
  (UserService as any).mockImplementation(() => ({
    getUserWithRolesAndPermissions: vi.fn().mockResolvedValue({ roles, permissions }),
  }));
}

describe("authMiddleware — cashier billing permission injection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always injects billing permissions for cashier role", async () => {
    mockUserService(CASHIER_ROLES, CASHIER_BASE_PERMS);
    const req = buildReq();
    const handler = vi.fn();

    await authMiddleware(handler)(req as any, buildRes() as any);

    expect(handler).toHaveBeenCalled();
    const permNames = req.user.permissions.map((p: any) => p.name);
    for (const perm of BILLING_PERMS) {
      expect(permNames).toContain(perm);
    }
  });

  it("does NOT query the DB to determine billing permissions for cashier", async () => {
    mockUserService(CASHIER_ROLES, CASHIER_BASE_PERMS);
    const req = buildReq();
    const handler = vi.fn();

    await authMiddleware(handler)(req as any, buildRes() as any);

    // No bill_settings lookup needed — permissions are always injected
    expect(req.db.query).not.toHaveBeenCalled();
  });

  it("does NOT inject billing permissions for supervisor role", async () => {
    mockUserService([{ name: "supervisor" }], [{ name: "can_add_bill" }]);
    const req = buildReq();
    const handler = vi.fn();

    await authMiddleware(handler)(req as any, buildRes() as any);

    expect(handler).toHaveBeenCalled();
    expect(req.db.query).not.toHaveBeenCalled();
  });

  it("does NOT inject CAN_APPROVE_VOID or CAN_APPROVE_CHANGE_REQUEST for cashier", async () => {
    mockUserService(CASHIER_ROLES, CASHIER_BASE_PERMS);
    const req = buildReq();
    const handler = vi.fn();

    await authMiddleware(handler)(req as any, buildRes() as any);

    const permNames = req.user.permissions.map((p: any) => p.name);
    expect(permNames).not.toContain("can_approve_void");
    expect(permNames).not.toContain("can_approve_change_request");
  });

  it("preserves base cashier permissions alongside injected billing permissions", async () => {
    mockUserService(CASHIER_ROLES, CASHIER_BASE_PERMS);
    const req = buildReq();
    const handler = vi.fn();

    await authMiddleware(handler)(req as any, buildRes() as any);

    const permNames = req.user.permissions.map((p: any) => p.name);
    expect(permNames).toContain("can_print");
    expect(permNames).toContain("can_view_bill");
    expect(permNames).toContain("can_close_bill");
    for (const perm of BILLING_PERMS) {
      expect(permNames).toContain(perm);
    }
  });

  it("passes through when auth middleware calls next handler", async () => {
    mockUserService(CASHIER_ROLES, CASHIER_BASE_PERMS);
    const req = buildReq();
    const handler = vi.fn();

    await authMiddleware(handler)(req as any, buildRes() as any);

    expect(handler).toHaveBeenCalledOnce();
  });

  it("attaches user roles and permissions to req.user", async () => {
    mockUserService(CASHIER_ROLES, CASHIER_BASE_PERMS);
    const req = buildReq();
    const handler = vi.fn();

    await authMiddleware(handler)(req as any, buildRes() as any);

    expect(req.user.roles).toEqual(CASHIER_ROLES);
    expect(req.user.permissions.some((p: any) => p.name === "can_print")).toBe(true);
  });
});
