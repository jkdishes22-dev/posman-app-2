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
    return originalQuery(patched, params);
  };
  return queryRunner;
}

module.exports = { patchQueryRunner };
