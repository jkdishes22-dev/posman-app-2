import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import { handleApiError } from "@backend/utils/errorHandler";
import { SqliteRestoreService } from "@backend/service/SqliteRestoreService";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (process.env.DB_MODE !== "sqlite" || !process.env.SQLITE_DB_PATH) {
    return res.status(400).json({ error: "Restore is only available in SQLite mode" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  return authorize([permissions.CAN_EDIT_SYSTEM_SETTINGS])(async (request, response) => {
    const form = formidable({
      maxFileSize: MAX_UPLOAD_BYTES,
      keepExtensions: true,
    });

    let uploadedPath: string | null = null;
    try {
      const [, files] = await form.parse(request);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) {
        return response.status(400).json({ error: "No file uploaded (expected field name: file)" });
      }
      uploadedPath = file.filepath;
      const orig = (file.originalFilename || "").toLowerCase();
      if (!orig.endsWith(".db")) {
        try {
          fs.unlinkSync(uploadedPath);
        } catch {
          /* ignore */
        }
        return response.status(400).json({ error: "Upload must be a .db SQLite file" });
      }

      const result = await SqliteRestoreService.restoreFromDatabaseFile(uploadedPath);

      try {
        fs.unlinkSync(uploadedPath);
      } catch {
        /* ignore */
      }
      uploadedPath = null;

      return response.status(200).json({
        success: true,
        mode: "upload",
        restoredFrom: result.restoredFrom,
        preRestorePath: result.preRestorePath,
        message: "Database restored. Sign in again if the app shows errors.",
      });
    } catch (error: unknown) {
      if (uploadedPath) {
        try {
          fs.unlinkSync(uploadedPath);
        } catch {
          /* ignore */
        }
      }
      const { userMessage, errorCode } = handleApiError(error, {
        operation: "restoring",
        resource: "database",
      });
      return response.status(500).json({ error: userMessage, code: errorCode });
    }
  })(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
