import { NextApiRequest, NextApiResponse } from "next";
import { User } from "@entities/User";
import jwt from "jsonwebtoken";
import { getConnection } from "@backend/config/data-source";
import { v4 as uuidv4 } from "uuid";

const secret =
    process.env.JWT_SECRET ||
    "4d7f12a75ea5f8fb40e8540264d47610d8aef0af421fa8643e3fdb5eb92f69ba";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }
    
    try {
        const db = await getConnection();
        const refreshToken = req.cookies["refreshToken"];
        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh token" });
        }
        
        // Load user with roles relation to get updated roles/permissions
        const user = await db.getRepository(User).findOne({ 
            where: { refreshToken },
            relations: ["roles"]
        });
        
        if (!user) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        
        // Issue new JWT with same structure as login endpoint
        // This ensures roles are always up-to-date when token is refreshed
        const token = jwt.sign(
            {
                user: {
                    firstname: user.firstName,
                    lastname: user.lastName,
                },
                id: user.id,
                roles: user.roles.map((role) => role.name),
            },
            secret,
            { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
        );
        
        // Issue new refresh token
        const newRefreshToken = uuidv4();
        user.refreshToken = newRefreshToken;
        await db.getRepository(User).save(user);
        res.setHeader("Set-Cookie", `refreshToken=${newRefreshToken}; HttpOnly; Path=/; Max-Age=14400; Secure; SameSite=Strict`); // 4 hours
        
        return res.status(200).json({ token });
    } catch (error: any) {
        console.error("Error refreshing token:", error);
        return res.status(500).json({ message: "Internal Server Error" + error.message });
    }
} 