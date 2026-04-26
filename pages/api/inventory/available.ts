import { authMiddleware } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { getAvailableInventoryHandler } from "@backend/controllers/InventoryController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";

// Custom permission check: allow users with EITHER CAN_VIEW_INVENTORY OR CAN_ADD_BILL
const checkInventoryAccess = (handler: any) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const userPermissions = req.user.permissions?.map((perm: any) => perm.name) || [];
        const hasViewInventory = userPermissions.includes(permissions.CAN_VIEW_INVENTORY);
        const hasAddBill = userPermissions.includes(permissions.CAN_ADD_BILL);

        // Allow if user has EITHER permission (OR logic)
        if (!hasViewInventory && !hasAddBill) {
            // Check if user has admin role
            const userRoles = req.user.roles?.map((role: any) => role.name) || [];
            const isAdmin = userRoles.includes("admin");

            return res.status(403).json({
                message: "Forbidden (Missing permissions)",
                missingPermissions: [permissions.CAN_VIEW_INVENTORY, permissions.CAN_ADD_BILL],
                isAdmin,
                userRoles,
                requiredPermissions: `Either ${permissions.CAN_VIEW_INVENTORY} or ${permissions.CAN_ADD_BILL}`,
            });
        }

        // User has required permission, proceed with handler
        return handler(req, res);
    };
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        // Allow both inventory viewers and bill creators to check availability
        // Sales users need to see inventory availability when creating bills
        return authMiddleware(
            checkInventoryAccess(getAvailableInventoryHandler),
        )(req, res);
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware)(handler);

