import permissions from "@backend/config/managed-roles";
import { removeItemFromGroupHandler } from "@backend/controllers/ItemController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
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

export default handler;