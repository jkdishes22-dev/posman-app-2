import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import fs from "fs";
import path from "path";

const MAX_LINES = 2000;

/**
 * Returns the last N lines of a text string efficiently.
 */
function lastLines(text: string, n: number): string {
    const lines = text.split("\n");
    return lines.slice(Math.max(0, lines.length - n)).join("\n");
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    return authorize([permissions.CAN_VIEW_PERMISSION])(async (request: NextApiRequest, response: NextApiResponse) => {
        const logDir = process.env.LOG_DIR;
        if (!logDir) {
            return response.status(503).json({ error: "Log directory is not configured. Ensure the app is running inside Electron." });
        }

        if (!fs.existsSync(logDir)) {
            return response.status(200).json({ files: [], content: null });
        }

        // GET /api/system/logs — list available log files (sorted newest-first)
        if (request.method === "GET" && !request.query.file) {
            try {
                const files = fs.readdirSync(logDir)
                    .filter(f => f.startsWith("app-") && f.endsWith(".log"))
                    .sort()
                    .reverse()
                    .map(filename => {
                        const filePath = path.join(logDir, filename);
                        const stat = fs.statSync(filePath);
                        // Extract date from filename: app-YYYY-MM-DD.log
                        const date = filename.replace("app-", "").replace(".log", "");
                        return { filename, date, sizeBytes: stat.size };
                    });

                return response.status(200).json({ files, logDir });
            } catch (err: any) {
                return response.status(500).json({ error: `Failed to list log files: ${err.message}` });
            }
        }

        // GET /api/system/logs?file=app-YYYY-MM-DD.log — read a specific log file
        if (request.method === "GET" && request.query.file) {
            const filename = String(request.query.file);

            // Security: only allow reading files named app-YYYY-MM-DD.log, no path traversal
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
        }

        response.setHeader("Allow", ["GET"]);
        return response.status(405).json({ error: `Method ${request.method} not allowed` });
    })(req, res);
};

export default withMiddleware([authMiddleware], handler);
