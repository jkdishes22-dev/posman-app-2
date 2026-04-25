import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { UserService } from "@backend/service/UserService";
import { cache } from "@backend/utils/cache";
import bcrypt from "bcryptjs";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Not authenticated" });
        const userService = new UserService(req.db);
        if (req.method === "GET") {
            // Check cache first (using shared cache utility)
            const cacheKey = `api_user_me_${userId}`;
            const cached = cache.get<any>(cacheKey); // TTL is set on cache.set below
            
            if (cached !== null) {
                // Set cache headers for browser caching
                res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
                return res.status(200).json(cached);
            }

            // Fetch user with roles and stations
            const user = await userService.getUserWithRolesAndStations(Number(userId));
            if (!user) return res.status(404).json({ error: "User not found" });
            
            const response = {
                ...user,
                created_at: user.created_at,
                updated_at: user.updated_at,
                created_by: user.created_by,
                updated_by: user.updated_by,
            };

            // Cache the response (using shared cache utility)
            cache.set(cacheKey, response, 60000); // 60 second TTL
            
            // Set cache headers
            res.setHeader("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
            res.status(200).json(response);
        } else if (req.method === "PATCH") {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: "Current and new password required" });
            }
            const user = await userService.getUserById(Number(userId));
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Current password is incorrect" });
            }
            user.password = await bcrypt.hash(newPassword, 10);
            user.updated_by = Number(userId);
            await req.db.getRepository("User").save(user);
            
            // Invalidate user cache after password update
            const cacheKey = `api_user_me_${userId}`;
            cache.delete(cacheKey);
            
            res.status(200).json({ message: "Password updated successfully" });
        } else {
            res.setHeader("Allow", ["GET", "PATCH"]);
            res.status(405).json({ error: "Method Not Allowed" });
        }
    } catch (error: any) {
        res.status(500).json({ error: "Some error occurred. Please try again." });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler); 