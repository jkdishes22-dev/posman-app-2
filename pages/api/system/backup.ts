import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import fs from "fs";
import path from "path";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    return authMiddleware(
        authorize([permissions.CAN_VIEW_PERMISSION])(async (req: NextApiRequest, res: NextApiResponse) => {
            try {
                const dbPath = process.env.SQLITE_DB_PATH;
                if (!dbPath) {
                    return res.status(400).json({ error: "Backup is only available in SQLite mode" });
                }

                if (!fs.existsSync(dbPath)) {
                    return res.status(404).json({ error: "Database file not found" });
                }

                const backupDir = path.join(path.dirname(dbPath), "backups");
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }

                const today = new Date().toISOString().slice(0, 10);
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                const backupPath = path.join(backupDir, `posman-backup-${timestamp}.db`);

                fs.copyFileSync(dbPath, backupPath);

                // Check if the WAL file exists and copy it too (SQLite WAL mode)
                const walPath = dbPath + "-wal";
                if (fs.existsSync(walPath)) {
                    fs.copyFileSync(walPath, backupPath + "-wal");
                }

                return res.status(200).json({
                    success: true,
                    path: backupPath,
                    date: today,
                    size: fs.statSync(backupPath).size,
                });
            } catch (error: any) {
                console.error("[backup] Failed:", error.message);
                return res.status(500).json({ error: "Some error occurred. Please try again." });
            }
        })
    )(req, res);
};

export default withMiddleware(dbMiddleware)(handler);
