import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import { ReopenReasonService } from "@backend/service/ReopenReasonService";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        return authMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
            try {
                const reopenReasonService = new ReopenReasonService(req.db);
                const includeInactive = req.query.includeInactive === "true";
                const reasons = includeInactive
                    ? await reopenReasonService.getAllReasons()
                    : await reopenReasonService.getAllActiveReasons();

                res.status(200).json({
                    success: true,
                    reasons: reasons.map(reason => ({
                        id: reason.id,
                        reason_key: reason.reason_key,
                        name: reason.name,
                        description: reason.description,
                        is_active: reason.is_active,
                        sort_order: reason.sort_order,
                        created_at: reason.created_at,
                        updated_at: reason.updated_at
                    }))
                });
            } catch (error: any) {
                console.error("Error fetching reopen reasons:", error);
                res.status(500).json({
                    success: false,
                    error: "Failed to fetch reopen reasons",
                    details: undefined
                });
            }
        })(req, res);
    } else if (req.method === "POST") {
        return authMiddleware(
            authorize([permissions.CAN_EDIT_BILL])(async (req: NextApiRequest, res: NextApiResponse) => {
                try {
                    const { reason_key, name, description, is_active, sort_order } = req.body;

                    if (!reason_key || !name) {
                        return res.status(400).json({
                            success: false,
                            error: "reason_key and name are required"
                        });
                    }

                    const reopenReasonService = new ReopenReasonService(req.db);
                    const userId = Number(req.user?.id);

                    const reason = await reopenReasonService.createReason({
                        reason_key,
                        name,
                        description: description || null,
                        is_active: is_active !== undefined ? is_active : true,
                        sort_order: sort_order || 0,
                        created_by: userId,
                        updated_by: userId
                    });

                    res.status(201).json({
                        success: true,
                        reason: {
                            id: reason.id,
                            reason_key: reason.reason_key,
                            name: reason.name,
                            description: reason.description,
                            is_active: reason.is_active,
                            sort_order: reason.sort_order
                        }
                    });
                } catch (error: any) {
                    console.error("Error creating reopen reason:", error);
                    res.status(500).json({
                        success: false,
                        error: "Failed to create reopen reason",
                        details: undefined
                    });
                }
            })
        )(req, res);
    } else if (req.method === "PATCH") {
        return authMiddleware(
            authorize([permissions.CAN_EDIT_BILL])(async (req: NextApiRequest, res: NextApiResponse) => {
                try {
                    const { id } = req.query;
                    if (!id || isNaN(Number(id))) {
                        return res.status(400).json({
                            success: false,
                            error: "Valid id is required"
                        });
                    }

                    const { reason_key, name, description, is_active, sort_order } = req.body;
                    const reopenReasonService = new ReopenReasonService(req.db);
                    const userId = Number(req.user?.id);

                    const updateData: any = {};
                    if (reason_key !== undefined) updateData.reason_key = reason_key;
                    if (name !== undefined) updateData.name = name;
                    if (description !== undefined) updateData.description = description;
                    if (is_active !== undefined) updateData.is_active = is_active;
                    if (sort_order !== undefined) updateData.sort_order = sort_order;
                    updateData.updated_by = userId;

                    const reason = await reopenReasonService.updateReason(Number(id), updateData);

                    if (!reason) {
                        return res.status(404).json({
                            success: false,
                            error: "Reopen reason not found"
                        });
                    }

                    res.status(200).json({
                        success: true,
                        reason: {
                            id: reason.id,
                            reason_key: reason.reason_key,
                            name: reason.name,
                            description: reason.description,
                            is_active: reason.is_active,
                            sort_order: reason.sort_order
                        }
                    });
                } catch (error: any) {
                    console.error("Error updating reopen reason:", error);
                    res.status(500).json({
                        success: false,
                        error: "Failed to update reopen reason",
                        details: undefined
                    });
                }
            })
        )(req, res);
    } else if (req.method === "DELETE") {
        return authMiddleware(
            authorize([permissions.CAN_EDIT_BILL])(async (req: NextApiRequest, res: NextApiResponse) => {
                try {
                    const { id } = req.query;
                    if (!id || isNaN(Number(id))) {
                        return res.status(400).json({
                            success: false,
                            error: "Valid id is required"
                        });
                    }

                    const reopenReasonService = new ReopenReasonService(req.db);
                    const deleted = await reopenReasonService.deleteReason(Number(id));

                    if (!deleted) {
                        return res.status(404).json({
                            success: false,
                            error: "Reopen reason not found"
                        });
                    }

                    res.status(200).json({
                        success: true,
                        message: "Reopen reason deleted successfully"
                    });
                } catch (error: any) {
                    console.error("Error deleting reopen reason:", error);
                    res.status(500).json({
                        success: false,
                        error: "Failed to delete reopen reason",
                        details: undefined
                    });
                }
            })
        )(req, res);
    } else {
        res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
        res.status(405).json({ error: "Method not allowed" });
    }
};

export default withMiddleware(dbMiddleware)(handler);
