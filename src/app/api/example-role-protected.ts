import { NextApiRequest, NextApiResponse } from "next";
import { requirePermission, requireRole, requireAllPermissions, AuthenticatedRequest } from "../../backend/middleware/acl";
import { withACL } from "../../backend/middleware/acl";

// Example API endpoint with role-based access control
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Wrap with ACL middleware
  return withACL(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    switch (req.method) {
      case "GET":
        return handleGet(req, res);
      case "POST":
        return handlePost(req, res);
      case "PUT":
        return handlePut(req, res);
      case "DELETE":
        return handleDelete(req, res);
      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        return res.status(405).json({ message: "Method not allowed" });
    }
  })(req, res);
}

// GET endpoint - requires view permission
async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const protectedHandler = requirePermission("can_view_item")(async (req, res) => {
    // Your business logic here
    res.status(200).json({
      message: "Items retrieved successfully",
      data: [] // Your data here
    });
  });

  return protectedHandler(req, res);
}

// POST endpoint - requires add permission
async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  const protectedHandler = requirePermission("can_add_item")(async (req, res) => {
    // Your business logic here
    res.status(201).json({
      message: "Item created successfully",
      data: {} // Your created item here
    });
  });

  return protectedHandler(req, res);
}

// PUT endpoint - requires edit permission
async function handlePut(req: AuthenticatedRequest, res: NextApiResponse) {
  const protectedHandler = requirePermission("can_edit_item")(async (req, res) => {
    // Your business logic here
    res.status(200).json({
      message: "Item updated successfully",
      data: {} // Your updated item here
    });
  });

  return protectedHandler(req, res);
}

// DELETE endpoint - requires delete permission
async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse) {
  const protectedHandler = requirePermission("can_delete_item")(async (req, res) => {
    // Your business logic here
    res.status(200).json({
      message: "Item deleted successfully"
    });
  });

  return protectedHandler(req, res);
}

// Example of role-based endpoint
export async function supervisorOnlyEndpoint(req: NextApiRequest, res: NextApiResponse) {
  const protectedHandler = requireRole(["supervisor", "admin"])(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Only supervisors and admins can access this
    res.status(200).json({
      message: "Supervisor data retrieved successfully",
      data: {} // Your supervisor-specific data here
    });
  });

  return withACL(protectedHandler)(req, res);
}

// Example of multiple permission requirement
export async function complexPermissionEndpoint(req: NextApiRequest, res: NextApiResponse) {
  const protectedHandler = requireAllPermissions(["can_view_bill", "can_edit_bill"])(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // User must have both permissions
    res.status(200).json({
      message: "Complex operation completed successfully",
      data: {} // Your data here
    });
  });

  return withACL(protectedHandler)(req, res);
}
