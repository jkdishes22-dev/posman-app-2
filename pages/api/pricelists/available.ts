import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { PricelistService } from "@backend/service/PricelistService";
import permissions from "@backend/config/managed-roles";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        await authMiddleware(
            authorize([permissions.CAN_VIEW_PRICELISTS])(async (req, res) => {
                const pricelistService = new PricelistService(req.db);

                // Get all pricelists that are not linked to any station
                const pricelists = await pricelistService.getAvailablePricelists();

                res.status(200).json({
                    message: "Available pricelists fetched successfully",
                    pricelists
                });
            })
        )(req, res);
    } catch (error: any) {
        console.error("Available pricelists error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
