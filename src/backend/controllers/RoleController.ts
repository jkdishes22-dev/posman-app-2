import { NextApiRequest, NextApiResponse } from "next";
import { RoleService } from "@services/RoleService";
import { PermissionService } from "@services/PermissionService";

const roleService = new RoleService();
const permissionService = new PermissionService();

export const fetchRolesHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const roles = await roleService.fetchRoles();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch roles", error });
  }
};

export const createRoleHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const newRole = req.body;
    const role = await roleService.createRole(newRole);
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: "Failed to create role", error });
  }
};

export const addPermissionToRoleHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const { roleId, permissionId } = req.body;
    await roleService.addPermissionToRole(roleId, permissionId);
    res.status(200).json({ message: "Permission added to role" });
  } catch (error) {
    console.log(error)
    res
      .status(500)
      .json({ message: "Failed to add permission to role", error });
  }
};

export const assignRoleToUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const { userId, roleId } = req.body;
    await roleService.assignRoleToUser(userId, roleId);
    res.status(200).json({ message: "Role assigned to user" });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign role to user", error });
  }
};

export const fetchPermissionsByRoleHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { roleId } = req.query;

  try {
    const permissions = await permissionService.fetchPermissionsByRole(roleId);
    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching permissions", error });
  }
};
