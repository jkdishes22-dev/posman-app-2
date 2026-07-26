import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted ensures the fn is created before vi.mock factories run
const { jwtSignMock } = vi.hoisted(() => ({
  jwtSignMock: vi.fn().mockReturnValue("mock.token"),
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: jwtSignMock, verify: vi.fn() },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
  compare: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@backend/utils/logger", () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@backend/utils/errorHandler", () => ({
  handleApiError: vi.fn().mockReturnValue({ userMessage: "Error", errorCode: "ERR" }),
}));

import { loginUserHandler } from "@backend/controllers/UserController";
import bcrypt from "bcryptjs";

const MOCK_USER = {
  id: 1,
  username: "admin",
  password: "$2b$10$hashedpassword",
  refreshToken: null,
  must_change_password: false,
};

function buildDb(queryRows: any[] = [{ value: JSON.stringify({}) }]) {
  return {
    options: { type: "sqlite" },
    getRepository: vi.fn().mockReturnValue({
      save: vi.fn().mockResolvedValue(MOCK_USER),
      manager: {
        query: vi.fn().mockResolvedValue([MOCK_USER]),
      },
    }),
    query: vi.fn().mockResolvedValue(queryRows),
  };
}

function buildRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
}

describe("loginUserHandler — session timeout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jwtSignMock.mockReturnValue("mock.token");
    (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
    delete process.env.JWT_EXPIRES_IN;
  });

  afterEach(() => {
    delete process.env.JWT_EXPIRES_IN;
  });

  it("uses session_timeout from system_settings when present", async () => {
    const req = {
      body: { username: "admin", password: "password" },
      db: buildDb([{ value: JSON.stringify({ session_config: { session_timeout: "4h" } }) }]),
    };

    await loginUserHandler(req as any, buildRes() as any);

    expect(jwtSignMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: "4h" })
    );
  });

  it("falls back to 8h when system_settings has no session_config", async () => {
    const req = {
      body: { username: "admin", password: "password" },
      db: buildDb([{ value: JSON.stringify({ printer_settings: {} }) }]),
    };

    await loginUserHandler(req as any, buildRes() as any);

    expect(jwtSignMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: "8h" })
    );
  });

  it("falls back to 8h when system_settings query returns no rows", async () => {
    const req = {
      body: { username: "admin", password: "password" },
      db: buildDb([]),
    };

    await loginUserHandler(req as any, buildRes() as any);

    expect(jwtSignMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: "8h" })
    );
  });

  it("falls back to 8h when system_settings query throws", async () => {
    const db = buildDb([]);
    db.query = vi.fn().mockRejectedValue(new Error("DB error"));

    const req = {
      body: { username: "admin", password: "password" },
      db,
    };

    await loginUserHandler(req as any, buildRes() as any);

    expect(jwtSignMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: "8h" })
    );
  });

  it("uses JWT_EXPIRES_IN env var as fallback over 8h when no DB setting", async () => {
    process.env.JWT_EXPIRES_IN = "12h";
    const req = {
      body: { username: "admin", password: "password" },
      db: buildDb([]),
    };

    await loginUserHandler(req as any, buildRes() as any);

    expect(jwtSignMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: "12h" })
    );
  });

  it("DB session_config overrides JWT_EXPIRES_IN env var", async () => {
    process.env.JWT_EXPIRES_IN = "12h";
    const req = {
      body: { username: "admin", password: "password" },
      db: buildDb([{ value: JSON.stringify({ session_config: { session_timeout: "1h" } }) }]),
    };

    await loginUserHandler(req as any, buildRes() as any);

    expect(jwtSignMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: "1h" })
    );
  });

  it("returns 401 when user is not found", async () => {
    const db = buildDb([]);
    db.getRepository = vi.fn().mockReturnValue({
      save: vi.fn(),
      manager: { query: vi.fn().mockResolvedValue([]) },
    });

    const req = { body: { username: "ghost", password: "x" }, db };
    const res = buildRes();

    await loginUserHandler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jwtSignMock).not.toHaveBeenCalled();
  });

  it("returns 401 when password does not match", async () => {
    (bcrypt.compare as any) = vi.fn().mockResolvedValue(false);
    const req = {
      body: { username: "admin", password: "wrongpass" },
      db: buildDb([]),
    };
    const res = buildRes();

    await loginUserHandler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jwtSignMock).not.toHaveBeenCalled();
  });
});
