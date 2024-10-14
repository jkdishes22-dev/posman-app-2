import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/managed-roles";
import { NextApiRequest, NextApiResponse } from "next";
import { fetchPermissionsByRoleHandler } from "@controllers/RoleController";
import { ensureMetadata } from "@backend/utils/metadata-hack";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await ensureMetadata("Permission");
  if (req.method === "GET") {
    await authMiddleware(
      authorize([permissions.CAN_VIEW_PERMISSION])(
        fetchPermissionsByRoleHandler,
      ),
    )(req, res);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default handler;
