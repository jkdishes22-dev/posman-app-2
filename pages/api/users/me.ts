import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { UserService } from "@backend/service/UserService";
import { cache } from "@backend/utils/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { SECURITY_QUESTIONS } from "@backend/config/securityQuestions";
import type { DataSource } from "typeorm";

async function getMinPasswordLength(db: DataSource): Promise<number> {
    try {
        const rows = await db.query("SELECT value FROM system_settings WHERE key = 'system_settings'");
        if (rows?.length > 0) {
            const settings = JSON.parse(rows[0].value);
            const len = settings?.security_policy?.min_password_length;
            if (typeof len === "number" && len >= 4) return len;
        }
    } catch { /* fall through to default */ }
    return 8;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Not authenticated" });
        const userService = new UserService(req.db);

        if (req.method === "GET") {
            const cacheKey = `api_user_me_${userId}`;
            const cached = cache.get<any>(cacheKey);

            if (cached !== null) {
                res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
                return res.status(200).json(cached);
            }

            const user = await userService.getUserWithRolesAndStations(Number(userId));
            if (!user) return res.status(404).json({ error: "User not found" });

            const securityStatus = await userService.getSecuritySetupStatus(Number(userId));

            const response = {
                ...user,
                created_at: user.created_at,
                updated_at: user.updated_at,
                created_by: user.created_by,
                updated_by: user.updated_by,
                securitySetup: securityStatus,
            };

            cache.set(cacheKey, response, 60000);
            res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
            res.status(200).json(response);

        } else if (req.method === "PATCH") {
            const { action } = req.body;

            if (action === "setup-security") {
                const { question, answer } = req.body;
                if (!question || !answer) {
                    return res.status(400).json({ error: "Question and answer are required" });
                }
                if (!SECURITY_QUESTIONS.includes(question)) {
                    return res.status(400).json({ error: "Invalid security question" });
                }
                if (answer.trim().length < 2) {
                    return res.status(400).json({ error: "Answer is too short" });
                }
                const answerHash = await bcrypt.hash(answer.trim().toLowerCase(), 10);
                await userService.setupSecurity(Number(userId), question, answerHash);
                return res.status(200).json({ message: "Security question saved" });

            } else if (action === "generate-recovery-code") {
                const plainCode = randomBytes(4).toString("hex").toUpperCase(); // 8 hex chars
                const codeHash = await bcrypt.hash(plainCode, 10);
                await userService.generateRecoveryCode(Number(userId), codeHash);
                return res.status(200).json({ code: plainCode, message: "Save this code — it will not be shown again." });

            } else {
                // Default: change own password
                const { currentPassword, newPassword } = req.body;
                if (!currentPassword || !newPassword) {
                    return res.status(400).json({ error: "Current and new password required" });
                }
                const minLen = await getMinPasswordLength(req.db);
                if (newPassword.length < minLen) {
                    return res.status(400).json({ error: `New password must be at least ${minLen} characters.` });
                }
                const user = await userService.getUserById(Number(userId));
                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) {
                    return res.status(400).json({ error: "Current password is incorrect" });
                }
                user.password = await bcrypt.hash(newPassword, 10);
                user.must_change_password = false;
                user.updated_by = Number(userId);
                await req.db.getRepository("User").save(user);

                const cacheKey = `api_user_me_${userId}`;
                cache.delete(cacheKey);

                res.status(200).json({ message: "Password updated successfully" });
            }
        } else {
            res.setHeader("Allow", ["GET", "PATCH"]);
            res.status(405).json({ error: "Method Not Allowed" });
        }
    } catch (error: any) {
        res.status(500).json({ error: "Some error occurred. Please try again." });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
