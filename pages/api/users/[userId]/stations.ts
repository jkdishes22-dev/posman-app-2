import permissions from "@backend/config/managed-roles";
import { fetchUserStations } from "@backend/controllers/UserController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        await authMiddleware(
            authorize([permissions.CAN_VIEW_USER_STATION])(fetchUserStations)
        )(req, res)
    }
    else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default handler;