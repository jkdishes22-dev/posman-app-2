/**
 * Vitest setupFile — runs inside the test worker process before any tests.
 *
 * Patches TypeORM's AbstractSqliteDriver so that entity columns declared with
 * `type: "enum"` normalise to "varchar" and pass validation when the driver is
 * better-sqlite3.  Without this, AppDataSource.initialize() throws
 * DataTypeNotSupportedError for every entity that has an enum column.
 */

// AbstractSqliteDriver.normalizeType is the method the entity-metadata
// validator uses to resolve a column's canonical type string before checking
// it against supportedDataTypes.  SQLite stores enums as TEXT/VARCHAR anyway,
// so mapping "enum" → "varchar" is semantically correct.
async function patch() {
  const mod = await import(
    // @ts-ignore — internal TypeORM path, no public types
    "typeorm/driver/sqlite-abstract/AbstractSqliteDriver.js"
  );
  const Driver = (mod.AbstractSqliteDriver ?? mod.default) as any;
  if (!Driver) return;

  const orig = Driver.prototype.normalizeType;
  Driver.prototype.normalizeType = function (column: any) {
    if (column.type === "enum") return "varchar";
    return orig.call(this, column);
  };
}

// Run synchronously-ish: export a promise Vitest can await via setupFiles
await patch();
export {};
