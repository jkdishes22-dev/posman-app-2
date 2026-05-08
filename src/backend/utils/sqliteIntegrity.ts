import type { DataSource } from "typeorm";

/**
 * Interprets PRAGMA quick_check result rows. SQLite returns one or more rows with a single column (often `quick_check`).
 */
export function getSqliteQuickCheckResult(rows: unknown[]): { ok: boolean; message: string } {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "PRAGMA quick_check returned no rows" };
  }
  for (const row of rows) {
    const rec = row as Record<string, unknown>;
    const v = rec.quick_check ?? rec.QUICK_CHECK ?? Object.values(rec)[0];
    if (v !== "ok") {
      return { ok: false, message: `SQLite integrity check failed: ${String(v)}` };
    }
  }
  return { ok: true, message: "ok" };
}

export async function assertSqliteQuickCheckOrThrow(dataSource: DataSource): Promise<void> {
  const rows = await dataSource.query("PRAGMA quick_check");
  const result = getSqliteQuickCheckResult(rows);
  if (!result.ok) {
    throw new Error(result.message);
  }
}
