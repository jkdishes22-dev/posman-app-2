import { NextApiRequest, NextApiResponse } from "next";
import { PermissionService } from "@services/PermissionService";
import { handleApiError } from "@backend/utils/errorHandler";

export const fetchPermissionsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const permissionService = new PermissionService(req.db);
  try {
    const permissions = await permissionService.fetchPermissions();
    res.status(200).json(permissions);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "permissions"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const createPermissionHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const permissionService = new PermissionService(req.db);
  try {
    const { name, scope } = req.body;
    const permission = await permissionService.createPermission({
      name,
      scope,
    });
    res.status(201).json(permission);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "creating",
      resource: "permission"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};
