// Returns the correct TypeORM column type for the current database driver.
// SQLite (better-sqlite3) does not support "enum" or "json" natively;
// we fall back to "varchar" and "simple-json" respectively.
const SQLITE = (process.env.DB_MODE ?? "mysql") === "sqlite";

export const enumColType = SQLITE ? ("varchar" as const) : ("enum" as const);
export const jsonColType = SQLITE ? ("simple-json" as const) : ("json" as const);