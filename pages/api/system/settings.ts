import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { key, sub } = req.query;

    if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "Missing required query param: key" });
    }

    const subKey = typeof sub === "string" ? sub : undefined;

    if (req.method === "GET") {
        return authorize([permissions.CAN_VIEW_SYSTEM_SETTINGS])(async (request: NextApiRequest, response: NextApiResponse) => {
            try {
                const rows: any[] = await request.db.query(
                    "SELECT value FROM system_settings WHERE key = ?",
                    [key]
                );
                if (!rows.length) {
                    return response.status(404).json({ error: "Setting not found" });
                }
                const parsed = JSON.parse(rows[0].value);
                const value = subKey !== undefined ? (parsed[subKey] ?? null) : parsed;
                return response.status(200).json({ key, sub: subKey, value });
            } catch (error: any) {
                console.error("[settings GET] Failed:", error.message);
                return response.status(500).json({ error: "Failed to read setting" });
            }
        })(req, res);
    }

    if (req.method === "PUT") {
        return authorize([permissions.CAN_EDIT_SYSTEM_SETTINGS])(async (request: NextApiRequest, response: NextApiResponse) => {
            try {
                const body = request.body;
                if (body === undefined || body === null) {
                    return response.status(400).json({ error: "Request body is required" });
                }

                if (subKey !== undefined) {
                    // Read the current top-level value and merge only the sub-key
                    const existing: any[] = await request.db.query(
                        "SELECT value FROM system_settings WHERE key = ?",
                        [key]
                    );
                    const current = existing.length ? JSON.parse(existing[0].value) : {};
                    const merged = { ...current, [subKey]: body };
                    await request.db.query(
                        "INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                        [key, JSON.stringify(merged)]
                    );
                    return response.status(200).json({ key, sub: subKey, value: body });
                }

                await request.db.query(
                    "INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                    [key, JSON.stringify(body)]
                );
                return response.status(200).json({ key, value: body });
            } catch (error: any) {
                console.error("[settings PUT] Failed:", error.message);
                return response.status(500).json({ error: "Failed to save setting" });
            }
        })(req, res);
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);