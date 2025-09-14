import { NextApiRequest, NextApiResponse } from "next";
import { RoleService } from "@services/RoleService";
import { PermissionService } from "@services/PermissionService";

export const fetchRolesHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const roleService = new RoleService(req.db);
  try {
    const roles = await roleService.fetchRoles();
    res.status(200).json(roles);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch roles", error });
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
    res.status(500).json({ message: "Failed to create role", error });
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
    res.status(200).json({ message: "Permission added to role" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to add permission to role", error });
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
    res.status(200).json({ message: "Role assigned to user" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to assign role to user", error });
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
    res.status(500).json({ message: "Error fetching permissions", error });
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
    res.status(200).json({ message: "Permission removed from role" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to remove permission from role", error });
  }
};
