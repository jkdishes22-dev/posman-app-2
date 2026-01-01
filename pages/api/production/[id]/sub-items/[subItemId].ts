import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import permissions from "@backend/config/permissions";
import { ItemService } from "@backend/service/ItemService";
import { getConnection } from "@backend/config/data-source";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { id, subItemId } = req.query;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    if (!subItemId || isNaN(Number(subItemId))) {
        return res.status(400).json({ message: "Invalid sub-item ID" });
    }

    if (req.method === "DELETE") {
        return authMiddleware(
            authorize([permissions.CAN_DELETE_ITEM])(async (req, res) => {
                try {
                    const connection = await getConnection();
                    const itemService = new ItemService(connection);
                    await itemService.removeItemFromGroup(Number(id), Number(subItemId));
                    res.status(200).json({ message: "Sub-item removed successfully" });
                } catch (error: any) {
                    console.error("Error removing sub-item:", error);
                    res.status(500).json({
                        message: "Failed to remove sub-item",
                        error: error.message
                    });
                }
            })
        )(req, res);
    } else if (req.method === "PATCH") {
        return authMiddleware(
            authorize([permissions.CAN_ADD_ITEM])(async (req, res) => {
                try {
                    const { portionSize } = req.body;

                    if (portionSize === undefined || portionSize === null || isNaN(Number(portionSize))) {
                        return res.status(400).json({
                            message: "portionSize is required and must be a valid number"
                        });
                    }

                    const connection = await getConnection();
                    const itemService = new ItemService(connection);
                    await itemService.updatePortionSize(Number(id), Number(subItemId), Number(portionSize));
                    res.status(200).json({ message: "Portion size updated successfully" });
                } catch (error: any) {
                    console.error("Error updating portion size:", error);
                    res.status(500).json({
                        message: "Failed to update portion size",
                        error: error.message
                    });
                }
            })
        )(req, res);
    } else {
        res.setHeader("Allow", ["DELETE", "PATCH"]);
        res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);

