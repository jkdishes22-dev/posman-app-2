import path from "path";

/** In-app backups created by /api/system/backup (see pages/api/system/backup.ts). */
export const POSMAN_BACKUP_PREFIX = "posman-backup-";

/** Snapshots taken immediately before a restore attempt. */
export const PRE_RESTORE_PREFIX = "pre-restore-";

/**
 * Returns true if this filename should be considered for "restore latest" (newest mtime wins).
 */
export function isLatestEligibleBackupFilename(filename: string): boolean {
  const base = path.basename(filename);
  return (
    base.endsWith(".db") &&
    base.startsWith(POSMAN_BACKUP_PREFIX) &&
    !base.startsWith(PRE_RESTORE_PREFIX)
  );
}

/**
 * Resolves a backup filename to an absolute path under backupsDir, or null if unsafe / invalid.
 */
export function resolveSafeBackupDatabasePath(backupsDir: string, filename: string): string | null {
  if (!filename || typeof filename !== "string") return null;
  const base = path.basename(filename.trim());
  if (base !== filename.trim()) return null;
  if (base.includes("..") || base.includes("/") || base.includes("\\")) return null;
  if (!base.endsWith(".db")) return null;

  const resolvedFile = path.resolve(path.join(backupsDir, base));
  const resolvedDir = path.resolve(backupsDir);
  const prefix = resolvedDir.endsWith(path.sep) ? resolvedDir : `${resolvedDir}${path.sep}`;
  if (!resolvedFile.startsWith(prefix)) return null;

  return resolvedFile;
}
