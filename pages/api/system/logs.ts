import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import fs from "fs";
import path from "path";

const MAX_LINES = 2000;
const DEFAULT_RETENTION_DAYS = 14;

function lastLines(text: string, n: number): string {
    const lines = text.split("\n");
    return lines.slice(Math.max(0, lines.length - n)).join("\n");
}

async function getRetentionDays(db: NextApiRequest["db"]): Promise<number> {
    try {
        const rows: { value: string }[] = await db.query(
            "SELECT value FROM system_settings WHERE key = 'log_settings'"
        );
        if (rows.length > 0) {
            const parsed = JSON.parse(rows[0].value);
            const days = Number(parsed?.retention_days);
            if (Number.isFinite(days) && days > 0) return days;
        }
    } catch {
        // Fall back to default if table doesn't exist yet or value is malformed
    }
    return DEFAULT_RETENTION_DAYS;
}

/** Delete log files older than retentionDays. */
function pruneOldLogs(logDir: string, retentionDays: number): void {
    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);
        const cutoffStr = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

        const files = fs.readdirSync(logDir).filter(f => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(f));
        for (const file of files) {
            const date = file.replace("app-", "").replace(".log", "");
            if (date < cutoffStr) {
                fs.unlinkSync(path.join(logDir, file));
            }
        }
    } catch {
        // Non-fatal — log pruning is best-effort
    }
}

/**
 * GET /api/system/logs             → list available log files
 * GET /api/system/logs?file=<name> → read a specific log file (last 2000 lines)
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    return authorize([permissions.CAN_VIEW_PERMISSION])(async (request, response) => {
        if (request.method !== "GET") {
            response.setHeader("Allow", ["GET"]);
            return response.status(405).json({ error: `Method ${request.method} not allowed` });
        }

        const logDir = process.env.LOG_DIR;
        if (!logDir) {
            return response.status(503).json({ error: "Log directory is not configured. Ensure the app is running inside Electron." });
        }

        if (!fs.existsSync(logDir)) {
            return response.status(200).json({ files: [], retentionDays: DEFAULT_RETENTION_DAYS });
        }

        const retentionDays = await getRetentionDays(request.db);
        // Prune old files lazily on every list request
        pruneOldLogs(logDir, retentionDays);

        // Build cutoff for what to show (same window as retention)
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        // --- List mode ---
        if (!request.query.file) {
            try {
                const files = fs.readdirSync(logDir)
                    .filter(f => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(f))
                    .filter(f => {
                        const date = f.replace("app-", "").replace(".log", "");
                        return date >= cutoffStr;
                    })
                    .sort()
                    .reverse()
                    .map(filename => {
                        const stat = fs.statSync(path.join(logDir, filename));
                        const date = filename.replace("app-", "").replace(".log", "");
                        return { filename, date, sizeBytes: stat.size };
                    });

                return response.status(200).json({ files, retentionDays });
            } catch (err: any) {
                return response.status(500).json({ error: `Failed to list log files: ${err.message}` });
            }
        }

        // --- Read mode ---
        const filename = String(request.query.file);
        if (!/^app-\d{4}-\d{2}-\d{2}\.log$/.test(filename)) {
            return response.status(400).json({ error: "Invalid log filename." });
        }

        const filePath = path.join(logDir, filename);
        if (!fs.existsSync(filePath)) {
            return response.status(404).json({ error: `Log file ${filename} not found.` });
        }

        try {
            const raw = fs.readFileSync(filePath, "utf-8");
            const content = lastLines(raw, MAX_LINES);
            const totalLines = raw.split("\n").length;
            return response.status(200).json({ filename, content, totalLines, truncated: totalLines > MAX_LINES });
        } catch (err: any) {
            return response.status(500).json({ error: `Failed to read log file: ${err.message}` });
        }
    })(req, res);
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
