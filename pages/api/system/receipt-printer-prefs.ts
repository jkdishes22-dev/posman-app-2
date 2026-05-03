import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";

/**
 * Read-only printer prefs for receipt auto-print (billing UIs).
 * Requires `can_print` (narrow) — not full `can_view_system_settings`.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const rows: { value: string }[] = await req.db.query(
            "SELECT value FROM system_settings WHERE key = ?",
            ["system_settings"],
        );
        let printer: unknown = null;
        if (rows?.length) {
            const parsed = JSON.parse(rows[0].value);
            printer = parsed?.printer_settings ?? null;
        }
        if (!printer) {
            const legacy: { value: string }[] = await req.db.query(
                "SELECT value FROM system_settings WHERE key = ?",
                ["printer_settings"],
            );
            if (legacy?.length) {
                printer = JSON.parse(legacy[0].value);
            }
        }
        return res.status(200).json({ value: printer });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[receipt-printer-prefs GET]", msg);
        return res.status(500).json({ error: "Failed to read printer settings" });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(
    authorize([permissions.CAN_PRINT])(handler),
);
