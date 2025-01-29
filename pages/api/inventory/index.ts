import permissions from "@backend/config/managed-roles";
import { createInventoryItemHandler, fetchInventoryItemsHandler } from "@backend/controllers/InventoryController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { ensureMetadata } from "@backend/utils/metadata-hack";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    await ensureMetadata("User");
    await ensureMetadata("Item");

    if (req.method === "POST") {
        await authMiddleware(
            authorize([permissions.CAN_ADD_ITEM])(createInventoryItemHandler),
        )(req, res);
    } else if (req.method === "GET") {
        await authMiddleware(
            authorize([permissions.CAN_VIEW_ITEM])(fetchInventoryItemsHandler),
        )(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default handler;