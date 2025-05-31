import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { UserService } from "@backend/service/UserService";
import bcrypt from "bcryptjs";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Not authenticated" });
        const userService = new UserService(req.db);
        if (req.method === "GET") {
            // Fetch user with roles and stations
            const user = await userService.getUserWithRolesAndStations(Number(userId));
            if (!user) return res.status(404).json({ error: "User not found" });
            res.status(200).json({
                ...user,
                created_at: user.created_at,
                updated_at: user.updated_at,
                created_by: user.created_by,
                updated_by: user.updated_by,
            });
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
            user.updated_by = userId;
            await req.db.getRepository("User").save(user);
            res.status(200).json({ message: "Password updated successfully" });
        } else {
            res.setHeader("Allow", ["GET", "PATCH"]);
            res.status(405).json({ error: "Method Not Allowed" });
        }
    } catch (error: any) {
        res.status(500).json({ error: "Error fetching/updating user profile: " + error.message });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler); 