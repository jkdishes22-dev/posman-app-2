import { ProductionPreparationService } from "@backend/service/ProductionPreparationService";
import { ProductionPreparationStatus } from "@backend/entities/ProductionPreparation";
import { NextApiRequest, NextApiResponse } from "next";

export const createPreparationHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const preparationService = new ProductionPreparationService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { item_id, quantity_prepared, notes } = req.body;

        if (!item_id || !quantity_prepared) {
            return res.status(400).json({
                message: "Item ID and quantity prepared are required",
            });
        }

        const preparation = await preparationService.createPreparation(
            {
                item_id: Number(item_id),
                quantity_prepared: Number(quantity_prepared),
                notes: notes || undefined,
            },
            userId
        );
        res.status(201).json(preparation);
    } catch (error: any) {
        console.error("Error creating preparation:", error);
        res.status(500).json({
            message: "Failed to create preparation",
            error: error.message,
        });
    }
};

export const fetchPreparationsHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const preparationService = new ProductionPreparationService(req.db);
    try {
        const filters: any = {};

        if (req.query.item_id) {
            filters.item_id = Number(req.query.item_id);
        }
        if (req.query.status) {
            filters.status = req.query.status as ProductionPreparationStatus;
        }
        if (req.query.prepared_by) {
            filters.prepared_by = Number(req.query.prepared_by);
        }
        if (req.query.issued_by) {
            filters.issued_by = Number(req.query.issued_by);
        }
        if (req.query.start_date) {
            filters.start_date = new Date(req.query.start_date as string);
        }
        if (req.query.end_date) {
            filters.end_date = new Date(req.query.end_date as string);
        }

        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const offset = req.query.offset ? Number(req.query.offset) : 0;

        const result = await preparationService.fetchPreparations(filters, limit, offset);
        res.status(200).json(result);
    } catch (error: any) {
        console.error("Error fetching preparations:", error);
        res.status(500).json({
            message: "Failed to fetch preparations",
            error: error.message,
        });
    }
};

export const fetchPreparationHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const preparationService = new ProductionPreparationService(req.db);
    try {
        const { id } = req.query;
        const preparation = await preparationService.fetchPreparationById(Number(id));

        if (!preparation) {
            return res.status(404).json({ message: "Preparation not found" });
        }

        res.status(200).json(preparation);
    } catch (error: any) {
        console.error("Error fetching preparation:", error);
        res.status(500).json({
            message: "Failed to fetch preparation",
            error: error.message,
        });
    }
};

export const approvePreparationHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const preparationService = new ProductionPreparationService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.query;
        const preparation = await preparationService.approvePreparation(
            Number(id),
            userId
        );
        res.status(200).json(preparation);
    } catch (error: any) {
        console.error("Error approving preparation:", error);
        res.status(500).json({
            message: "Failed to approve preparation",
            error: error.message,
        });
    }
};

export const rejectPreparationHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const preparationService = new ProductionPreparationService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.query;
        const { rejection_reason } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({
                message: "Rejection reason is required",
            });
        }

        const preparation = await preparationService.rejectPreparation(
            Number(id),
            userId,
            rejection_reason
        );
        res.status(200).json(preparation);
    } catch (error: any) {
        console.error("Error rejecting preparation:", error);
        res.status(500).json({
            message: "Failed to reject preparation",
            error: error.message,
        });
    }
};

export const issueDirectlyHandler = async (
    req: NextApiRequest,
    res: NextApiResponse,
) => {
    const preparationService = new ProductionPreparationService(req.db);
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { item_id, quantity_prepared, notes, issue_date } = req.body;

        if (!item_id || !quantity_prepared) {
            return res.status(400).json({
                message: "Item ID and quantity prepared are required",
            });
        }

        // Parse issue_date if provided for prepared_at, otherwise use current date
        // issued_at always uses current timestamp (when the issue actually happens)
        let preparedAt: Date | undefined;
        if (issue_date) {
            const issueDate = new Date(issue_date);
            if (!isNaN(issueDate.getTime())) {
                // Set time to start of day for consistency
                issueDate.setHours(0, 0, 0, 0);
                preparedAt = issueDate;
            }
        }
        // issued_at always uses current timestamp
        const issuedAt = new Date();

        const preparation = await preparationService.issueDirectly(
            {
                item_id: Number(item_id),
                quantity_prepared: Number(quantity_prepared),
                notes: notes || undefined,
                prepared_at: preparedAt,
                issued_at: issuedAt,
            },
            userId
        );
        res.status(201).json(preparation);
    } catch (error: any) {
        console.error("Error issuing directly:", error);
        res.status(500).json({
            message: "Failed to issue production directly",
            error: error.message,
        });
    }
};

