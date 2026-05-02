import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";

/**
 * GET  /api/system/settings?key=<key>  → { key, value: <parsed JSON> }
 * PUT  /api/system/settings?key=<key>  body: any JSON  → { key, value }
 *
 * Both require admin-level permission (CAN_VIEW_PERMISSION for reads,
 * CAN_EDIT_PERMISSION for writes).
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const key = req.query.key as string;
    if (!key) {
        return res.status(400).json({ error: "Query param 'key' is required." });
    }

    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_PERMISSION])(async (request, response) => {
            try {
                const rows: { key: string; value: string }[] = await request.db.query(
                    "SELECT key, value FROM system_settings WHERE key = ?",
                    [key]
                );
                if (rows.length === 0) {
                    return response.status(404).json({ error: `Setting '${key}' not found.` });
                }
                return response.status(200).json({ key: rows[0].key, value: JSON.parse(rows[0].value) });
            } catch (err: any) {
                return response.status(500).json({ error: `Failed to read setting: ${err.message}` });
            }
        })(req, res);
    }

    if (req.method === "PUT") {
        return authorize([permissions.CAN_EDIT_PERMISSION])(async (request, response) => {
            try {
                const value = request.body;
                if (value === undefined) {
                    return response.status(400).json({ error: "Request body is required." });
                }
                const serialized = JSON.stringify(value);
                await request.db.query(
                    `INSERT INTO system_settings (key, value, updated_at)
                     VALUES (?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
                    [key, serialized]
                );
                return response.status(200).json({ key, value });
            } catch (err: any) {
                return response.status(500).json({ error: `Failed to save setting: ${err.message}` });
            }
        })(req, res);
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
