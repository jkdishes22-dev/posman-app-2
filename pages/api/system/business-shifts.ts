import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    return authorize([permissions.CAN_VIEW_BILL])(async (req, res) => {
        try {
            const rows: unknown[] = await req.db.query(
                "SELECT value FROM system_settings WHERE key = ?",
                ["system_settings"]
            );
            if (!rows.length) {
                return res.status(200).json({ shifts: [] });
            }
            const parsed = JSON.parse((rows[0] as { value: string }).value);
            const shifts = Array.isArray(parsed.business_shifts) ? parsed.business_shifts : [];
            return res.status(200).json({ shifts });
        } catch (error: any) {
            console.error("[business-shifts GET] Failed:", error.message);
            return res.status(500).json({ error: "Failed to read business shifts" });
        }
    })(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
