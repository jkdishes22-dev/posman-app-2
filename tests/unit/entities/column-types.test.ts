import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ENTITY_DIR = join(process.cwd(), "src/backend/entities");

// Helpers that don't contribute to the column-type mapping
const EXCLUDED_FILES = new Set(["column-types.ts", "BaseEntity.ts"]);

afterEach(() => {
  vi.resetModules();
});

describe("column-types helper values", () => {
  it("returns varchar and simple-json when DB_MODE=sqlite", async () => {
    process.env.DB_MODE = "sqlite";
    const { enumColType, jsonColType } = await import("@entities/column-types");
    expect(enumColType).toBe("varchar");
    expect(jsonColType).toBe("simple-json");
  });

  it("returns enum and json when DB_MODE=mysql", async () => {
    process.env.DB_MODE = "mysql";
    const { enumColType, jsonColType } = await import("@entities/column-types");
    expect(enumColType).toBe("enum");
    expect(jsonColType).toBe("json");
  });

  it("defaults to mysql types when DB_MODE is unset", async () => {
    delete process.env.DB_MODE;
    const { enumColType, jsonColType } = await import("@entities/column-types");
    expect(enumColType).toBe("enum");
    expect(jsonColType).toBe("json");
  });
});

describe("entity source guard — no hardcoded incompatible types", () => {
  const entityFiles = readdirSync(ENTITY_DIR)
    .filter((f) => f.endsWith(".ts") && !EXCLUDED_FILES.has(f));

  it('no entity uses hardcoded type: "enum" — must use enumColType from column-types.ts', () => {
    const violations = entityFiles.filter((file) => {
      const src = readFileSync(join(ENTITY_DIR, file), "utf-8");
      return /type:\s*["']enum["']/.test(src);
    });
    expect(violations, `Files with hardcoded "enum" type: ${violations.join(", ")}`).toHaveLength(0);
  });

  it('no entity uses hardcoded type: "json" — must use jsonColType from column-types.ts', () => {
    const violations = entityFiles.filter((file) => {
      const src = readFileSync(join(ENTITY_DIR, file), "utf-8");
      return /type:\s*["']json["']/.test(src);
    });
    expect(violations, `Files with hardcoded "json" type: ${violations.join(", ")}`).toHaveLength(0);
  });

});
