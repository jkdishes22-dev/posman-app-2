/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Patches a TypeORM QueryRunner so MySQL migrations run on SQLite.
 * Transforms:
 *   - Backtick identifiers → double-quote identifiers
 *   - NOW() → CURRENT_TIMESTAMP
 *   - INFORMATION_SCHEMA queries → sqlite_master equivalents (ignored — not used in seeds)
 */
function patchQueryRunner(queryRunner) {
  const originalQuery = queryRunner.query.bind(queryRunner);
  queryRunner.query = async (sql, params) => {
    const patched = sql
      .replace(/`([^`]+)`/g, '"$1"')         // `table` → "table"
      .replace(/\bNOW\(\)/g, "CURRENT_TIMESTAMP"); // NOW() → CURRENT_TIMESTAMP

    // SQLite3 can only bind numbers, strings, bigints, buffers, and null.
    // Convert JS booleans to 0/1 so boolean columns don't throw at runtime.
    const patchedParams = Array.isArray(params)
      ? params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p))
      : params;

    const result = await originalQuery(patched, patchedParams);

    // TypeORM's BetterSqlite3QueryRunner returns lastInsertRowid (number or
    // BigInt) for INSERT/UPDATE/DELETE, and an Array for SELECT queries.
    // MySQL migrations expect { insertId, affectedRows } for INSERT results.
    // Wrap numeric results so that `insertResult.insertId` works as in MySQL.
    if (!Array.isArray(result) && (typeof result === "number" || typeof result === "bigint")) {
      return { insertId: Number(result), affectedRows: 1 };
    }

    return result;
  };
  return queryRunner;
}

module.exports = { patchQueryRunner };
