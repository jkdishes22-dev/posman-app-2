import permissions from "@backend/config/managed-roles";
import { createProductionItemHandler, fetchProdutionItemsHandler } from "@backend/controllers/ProductionController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
// import { ensureMetadata } from "@backend/utils/metadata-hack";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    // await ensureMetadata("User");
    // await ensureMetadata("Item");

    if (req.method === "POST") {
        await authMiddleware(
            authorize([permissions.CAN_ADD_ITEM])(createProductionItemHandler),
        )(req, res);
    } else if (req.method === "GET") {
        await authMiddleware(
            authorize([permissions.CAN_VIEW_ITEM])(fetchProdutionItemsHandler),
        )(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(
    dbMiddleware,
    authMiddleware
  )(handler);
  