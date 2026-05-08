import { describe, it, expect } from "vitest";
import path from "path";
import {
  isLatestEligibleBackupFilename,
  resolveSafeBackupDatabasePath,
} from "../../src/backend/utils/sqliteBackupPaths";

describe("sqliteBackupPaths", () => {
  const backupsDir = path.join("/app", "userData", "backups");

  it("resolveSafeBackupDatabasePath accepts a simple basename under backupsDir", () => {
    const resolved = resolveSafeBackupDatabasePath(backupsDir, "posman-backup-2026-01-01T12-00-00.db");
    expect(resolved).toBe(path.join(backupsDir, "posman-backup-2026-01-01T12-00-00.db"));
  });

  it("resolveSafeBackupDatabasePath rejects path traversal", () => {
    expect(resolveSafeBackupDatabasePath(backupsDir, "../posman.db")).toBeNull();
    expect(resolveSafeBackupDatabasePath(backupsDir, "..\\evil.db")).toBeNull();
  });

  it("resolveSafeBackupDatabasePath rejects absolute paths disguised as filenames", () => {
    expect(resolveSafeBackupDatabasePath(backupsDir, "/etc/passwd")).toBeNull();
  });

  it("resolveSafeBackupDatabasePath rejects non-db extension", () => {
    expect(resolveSafeBackupDatabasePath(backupsDir, "readme.txt")).toBeNull();
  });

  it("isLatestEligibleBackupFilename accepts posman-backup and rejects pre-restore", () => {
    expect(isLatestEligibleBackupFilename("posman-backup-2026-01-01T12-00-00.db")).toBe(true);
    expect(isLatestEligibleBackupFilename("pre-restore-2026-01-01T12-00-00.db")).toBe(false);
  });
});
