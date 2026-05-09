import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";

const SETTINGS_KEY = "module_visibility";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        const { role } = req.query;
        if (!role || typeof role !== "string") {
            return res.status(400).json({ error: "Missing required query param: role" });
        }
        try {
            const rows: unknown[] = await req.db.query(
                "SELECT value FROM system_settings WHERE key = ?",
                [SETTINGS_KEY]
            );
            if (!rows.length) {
                return res.status(200).json({ role, visibility: {} });
            }
            const parsed = JSON.parse((rows[0] as { value: string }).value);
            return res.status(200).json({ role, visibility: parsed[role] ?? {} });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[module-visibility GET] Failed:", msg);
            return res.status(500).json({ error: "Failed to read module visibility" });
        }
    }

    if (req.method === "PUT") {
        return authorize([permissions.CAN_EDIT_SYSTEM_SETTINGS])(
            async (request: NextApiRequest, response: NextApiResponse) => {
                const { role, visibility } = request.body ?? {};
                if (!role || typeof role !== "string") {
                    return response.status(400).json({ error: "Missing required body field: role" });
                }
                if (typeof visibility !== "object" || visibility === null || Array.isArray(visibility)) {
                    return response.status(400).json({ error: "visibility must be an object" });
                }
                try {
                    const existing: unknown[] = await request.db.query(
                        "SELECT value FROM system_settings WHERE key = ?",
                        [SETTINGS_KEY]
                    );
                    const current = existing.length
                        ? JSON.parse((existing[0] as { value: string }).value)
                        : {};
                    const merged = { ...current, [role]: visibility };
                    await request.db.query(
                        "INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) " +
                        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                        [SETTINGS_KEY, JSON.stringify(merged)]
                    );
                    return response.status(200).json({ role, visibility });
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error("[module-visibility PUT] Failed:", msg);
                    return response.status(500).json({ error: "Failed to save module visibility" });
                }
            }
        )(req, res);
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
