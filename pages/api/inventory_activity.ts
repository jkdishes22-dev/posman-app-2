import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { DataSource } from "typeorm";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        await authMiddleware(
            authorize([permissions.CAN_VIEW_ITEM])(async (req, res) => {
                // For now, return empty array since we don't have inventory activity tracking implemented
                // This prevents the 404 error and allows the page to load
                const activities = [];
                res.status(200).json(activities);
            })
        )(req, res);
    } catch (error: any) {
        console.error("Inventory activity API error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
