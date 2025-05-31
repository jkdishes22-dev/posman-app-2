import { NextApiRequest, NextApiResponse } from "next";
import { User } from "@entities/User";
import jwt from "jsonwebtoken";
import { getConnection } from "@backend/config/data-source";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }
    const db = await getConnection();
    const refreshToken = req.cookies["refreshToken"];
    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token" });
    }
    const user = await db.getRepository(User).findOne({ where: { refreshToken } });
    if (!user) {
        return res.status(401).json({ message: "Invalid refresh token" });
    }
    // Issue new JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    });
    // Issue new refresh token
    const newRefreshToken = uuidv4();
    user.refreshToken = newRefreshToken;
    await db.getRepository(User).save(user);
    res.setHeader("Set-Cookie", `refreshToken=${newRefreshToken}; HttpOnly; Path=/; Max-Age=2592000`); // 30 days
    return res.status(200).json({ token });
} 