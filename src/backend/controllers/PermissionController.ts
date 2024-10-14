import { NextApiRequest, NextApiResponse } from "next";
import { PermissionService } from "@services/permissionService";

const permissionService = new PermissionService();

export const fetchPermissionsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const permissions = await permissionService.fetchPermissions();
    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch permissions", error });
  }
};

export const createPermissionHandler = async (req, res) => {
  try {
    const { name, scope } = req.body;
    const permission = await permissionService.createPermission({
      name,
      scope,
    });
    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: "Failed to create permission", error });
  }
};
