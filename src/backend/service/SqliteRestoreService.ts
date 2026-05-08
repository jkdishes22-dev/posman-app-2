import fs from "fs";
import path from "path";
import {
  AppDataSource,
  resumeDatabaseAfterFileOperations,
  suspendDatabaseForFileOperations,
} from "@backend/config/data-source";
import {
  isLatestEligibleBackupFilename,
  resolveSafeBackupDatabasePath,
} from "@backend/utils/sqliteBackupPaths";
import { getSqliteQuickCheckResult } from "@backend/utils/sqliteIntegrity";

export interface BackupListEntry {
  filename: string;
  size: number;
  mtimeMs: number;
}

function getSqlitePaths(): { dbPath: string; backupsDir: string } {
  const dbPath = process.env.SQLITE_DB_PATH;
  if (!dbPath) {
    throw new Error("SQLITE_DB_PATH is not set");
  }
  const backupsDir = path.join(path.dirname(dbPath), "backups");
  return { dbPath, backupsDir };
}

function copyMainAndMaybeWal(sourceDb: string, targetDb: string): void {
  fs.copyFileSync(sourceDb, targetDb);
  const sourceWal = `${sourceDb}-wal`;
  const targetWal = `${targetDb}-wal`;
  const targetShm = `${targetDb}-shm`;
  if (fs.existsSync(sourceWal)) {
    fs.copyFileSync(sourceWal, targetWal);
  } else {
    try {
      fs.unlinkSync(targetWal);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(targetShm);
    } catch {
      /* ignore */
    }
  }
}

async function runQuickCheck(): Promise<{ ok: boolean; message: string }> {
  const rows = await AppDataSource.query("PRAGMA quick_check");
  return getSqliteQuickCheckResult(rows);
}

export class SqliteRestoreService {
  static listBackups(): BackupListEntry[] {
    const { backupsDir } = getSqlitePaths();
    if (!fs.existsSync(backupsDir)) {
      return [];
    }
    const names = fs.readdirSync(backupsDir).filter((n) => n.endsWith(".db"));
    const out: BackupListEntry[] = [];
    for (const filename of names) {
      const fp = path.join(backupsDir, filename);
      try {
        const st = fs.statSync(fp);
        if (!st.isFile()) continue;
        out.push({ filename, size: st.size, mtimeMs: st.mtimeMs });
      } catch {
        /* skip */
      }
    }
    return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  }

  static getLatestBackupAbsolutePath(): string | null {
    const { backupsDir } = getSqlitePaths();
    const sorted = this.listBackups();
    for (const e of sorted) {
      if (isLatestEligibleBackupFilename(e.filename)) {
        return path.join(backupsDir, e.filename);
      }
    }
    return null;
  }

  /**
   * Replace live SQLite DB with contents of sourceDbPath (main + optional -wal sibling), with rollback on failure.
   */
  static async restoreFromDatabaseFile(sourceDbPath: string): Promise<{
    preRestorePath: string;
    restoredFrom: string;
  }> {
    const { dbPath, backupsDir } = getSqlitePaths();
    if (!fs.existsSync(sourceDbPath)) {
      throw new Error("Source database file not found");
    }
    if (!fs.existsSync(dbPath)) {
      throw new Error("Live database file not found");
    }

    fs.mkdirSync(backupsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const snapDb = path.join(backupsDir, `pre-restore-${timestamp}.db`);

    await suspendDatabaseForFileOperations();

    let snapWal: string | undefined;
    try {
      fs.copyFileSync(dbPath, snapDb);
      const liveWal = `${dbPath}-wal`;
      if (fs.existsSync(liveWal)) {
        snapWal = `${snapDb}-wal`;
        fs.copyFileSync(liveWal, snapWal);
      }

      copyMainAndMaybeWal(sourceDbPath, dbPath);
      await resumeDatabaseAfterFileOperations();

      const qc = await runQuickCheck();
      if (!qc.ok) {
        throw new Error(`Database integrity check failed: ${qc.message}`);
      }

      return { preRestorePath: snapDb, restoredFrom: sourceDbPath };
    } catch (err) {
      try {
        await suspendDatabaseForFileOperations();
        fs.copyFileSync(snapDb, dbPath);
        if (snapWal && fs.existsSync(snapWal)) {
          fs.copyFileSync(snapWal, `${dbPath}-wal`);
        } else {
          try {
            fs.unlinkSync(`${dbPath}-wal`);
          } catch {
            /* ignore */
          }
          try {
            fs.unlinkSync(`${dbPath}-shm`);
          } catch {
            /* ignore */
          }
        }
        await resumeDatabaseAfterFileOperations();
      } catch (rollbackErr) {
        console.error("[SqliteRestoreService] Rollback failed:", rollbackErr);
        try {
          await resumeDatabaseAfterFileOperations();
        } catch {
          /* ignore */
        }
      }
      throw err;
    }
  }

  static resolveInAppBackupPath(filename: string): string | null {
    const { backupsDir } = getSqlitePaths();
    return resolveSafeBackupDatabasePath(backupsDir, filename);
  }
}
