import { describe, it, expect } from "vitest";
import { getSqliteQuickCheckResult } from "../../src/backend/utils/sqliteIntegrity";

describe("getSqliteQuickCheckResult", () => {
  it("accepts single ok row", () => {
    expect(getSqliteQuickCheckResult([{ quick_check: "ok" }])).toEqual({ ok: true, message: "ok" });
  });

  it("rejects empty rows", () => {
    const r = getSqliteQuickCheckResult([]);
    expect(r.ok).toBe(false);
  });

  it("rejects non-ok value", () => {
    const r = getSqliteQuickCheckResult([{ quick_check: "*** in database main ***" }]);
    expect(r.ok).toBe(false);
    expect(r.message).toContain("integrity check failed");
  });
});
