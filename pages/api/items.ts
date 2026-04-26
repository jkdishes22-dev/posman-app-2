import { NextApiRequest, NextApiResponse } from "next";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { ProductionController } from "@backend/controllers/ProductionController";
import permissions from "@backend/config/permissions";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        await authorize([permissions.CAN_VIEW_ITEM])(async (req, res) => {
            const productionController = new ProductionController(req.db);
            const items = await productionController.fetchProductionItems();
            res.status(200).json(items);
        })(req, res);
    } catch (error: any) {
        console.error("Items API error:", error);
        res.status(500).json({ message: "Some error occurred. Please try again." });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
