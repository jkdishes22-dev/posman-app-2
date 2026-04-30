import { NextApiRequest, NextApiResponse } from "next";
import { RoleService } from "@services/RoleService";
import { PermissionService } from "@services/PermissionService";
import { handleApiError } from "@backend/utils/errorHandler";
import {
  invalidateAuthUserDetailsCache,
  invalidateAuthUserDetailsCacheForUser,
} from "@backend/middleware/auth";

export const fetchRolesHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const roleService = new RoleService(req.db);
  try {
    const roles = await roleService.fetchRoles();
    res.status(200).json(roles);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "roles"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const createRoleHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const roleService = new RoleService(req.db);
  try {
    const newRole = req.body;
    const role = await roleService.createRole(newRole);
    res.status(201).json(role);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "creating",
      resource: "role"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const addPermissionToRoleHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const roleService = new RoleService(req.db);
  try {
    const { roleId, permissionId } = req.body;
    await roleService.addPermissionToRole(roleId, permissionId);
    invalidateAuthUserDetailsCache();
    res.status(200).json({ message: "Permission added to role" });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "adding permission to",
      resource: "role"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const assignRoleToUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const roleService = new RoleService(req.db);
  try {
    const { userId, roleId } = req.body;
    await roleService.assignRoleToUser(userId, roleId);
    invalidateAuthUserDetailsCacheForUser(Number(userId));
    res.status(200).json({ message: "Role assigned to user" });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "assigning role to",
      resource: "user"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const fetchPermissionsByRoleHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { roleId } = req.query;
  const permissionService = new PermissionService(req.db);
  try {
    const permissions = await permissionService.fetchPermissionsByRole(roleId);
    res.status(200).json(permissions);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "permissions"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const removePermissionFromRoleHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const roleService = new RoleService(req.db);
  try {
    const { roleId, permissionId } = req.body;
    await roleService.removePermissionFromRole(roleId, permissionId);
    invalidateAuthUserDetailsCache();
    res.status(200).json({ message: "Permission removed from role" });
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "removing permission from",
      resource: "role"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};
