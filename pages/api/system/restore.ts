import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import { handleApiError } from "@backend/utils/errorHandler";
import { SqliteRestoreService } from "@backend/service/SqliteRestoreService";
import fs from "fs";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (process.env.DB_MODE !== "sqlite" || !process.env.SQLITE_DB_PATH) {
    return res.status(400).json({ error: "Restore is only available in SQLite mode" });
  }

  if (req.method === "GET") {
    return authorize([permissions.CAN_EDIT_SYSTEM_SETTINGS])(async (_req, response) => {
      try {
        const backups = SqliteRestoreService.listBackups();
        return response.status(200).json({ backups });
      } catch (error: unknown) {
        const { userMessage, errorCode } = handleApiError(error, {
          operation: "fetching",
          resource: "backups",
        });
        return response.status(500).json({ error: userMessage, code: errorCode });
      }
    })(req, res);
  }

  if (req.method === "POST") {
    return authorize([permissions.CAN_EDIT_SYSTEM_SETTINGS])(async (request, response) => {
      try {
        const body =
          typeof request.body === "object" && request.body !== null ? request.body : {};
        const mode = (body as { mode?: string }).mode;

        if (mode === "latest") {
          const latest = SqliteRestoreService.getLatestBackupAbsolutePath();
          if (!latest) {
            return response.status(400).json({ error: "No eligible backup found to restore" });
          }
          const result = await SqliteRestoreService.restoreFromDatabaseFile(latest);
          return response.status(200).json({
            success: true,
            mode: "latest",
            restoredFrom: result.restoredFrom,
            preRestorePath: result.preRestorePath,
            message: "Database restored. Sign in again if the app shows errors.",
          });
        }

        if (mode === "from_backup") {
          const filename = (body as { filename?: string }).filename;
          if (!filename || typeof filename !== "string") {
            return response.status(400).json({ error: "filename is required" });
          }
          const resolved = SqliteRestoreService.resolveInAppBackupPath(filename);
          if (!resolved || !fs.existsSync(resolved)) {
            return response.status(400).json({ error: "Invalid or missing backup file" });
          }
          const result = await SqliteRestoreService.restoreFromDatabaseFile(resolved);
          return response.status(200).json({
            success: true,
            mode: "from_backup",
            filename,
            restoredFrom: result.restoredFrom,
            preRestorePath: result.preRestorePath,
            message: "Database restored. Sign in again if the app shows errors.",
          });
        }

        return response.status(400).json({
          error: "Unsupported mode. Use \"latest\" or \"from_backup\".",
        });
      } catch (error: unknown) {
        const { userMessage, errorCode } = handleApiError(error, {
          operation: "restoring",
          resource: "database",
        });
        return response.status(500).json({ error: userMessage, code: errorCode });
      }
    })(req, res);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
