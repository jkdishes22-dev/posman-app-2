import { describe, it, expect } from "vitest";
import { resolveIsSearchable, AUTO_SEARCH_THRESHOLD } from "../../src/app/components/AppSelect";

describe("AppSelect resolveIsSearchable", () => {
  it("returns false when option count equals threshold", () => {
    expect(resolveIsSearchable(AUTO_SEARCH_THRESHOLD)).toBe(false);
  });

  it("returns false when option count is below threshold", () => {
    expect(resolveIsSearchable(3)).toBe(false);
    expect(resolveIsSearchable(0)).toBe(false);
  });

  it("returns true when option count exceeds threshold", () => {
    expect(resolveIsSearchable(AUTO_SEARCH_THRESHOLD + 1)).toBe(true);
    expect(resolveIsSearchable(100)).toBe(true);
  });

  it("respects explicit override true regardless of count", () => {
    expect(resolveIsSearchable(1, true)).toBe(true);
    expect(resolveIsSearchable(0, true)).toBe(true);
  });

  it("respects explicit override false regardless of count", () => {
    expect(resolveIsSearchable(100, false)).toBe(false);
    expect(resolveIsSearchable(AUTO_SEARCH_THRESHOLD + 1, false)).toBe(false);
  });
});
