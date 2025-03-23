import permissions from "@backend/config/managed-roles";
import { removeItemFromGroupHandler } from "@backend/controllers/ItemController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'DELETE') {
        await authMiddleware(
            authorize([permissions.CAN_ADD_ITEM])(removeItemFromGroupHandler),
        )(req, res);

    } else {
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withMiddleware(
    dbMiddleware,
    authMiddleware
  )(handler);