import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { PricelistService } from "@backend/service/PricelistService";
import { UserStation } from "@backend/entities/UserStation";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            // Check if user is admin
            const userRoles = req.user.roles.map((role) => role.name);
            const isAdmin = userRoles.includes('admin');

            console.log(`User ${userId} roles:`, userRoles, `isAdmin: ${isAdmin}`);

            let pricelists = [];

            if (isAdmin) {
                // Admins can see all pricelists (use the admin endpoint logic)
                const pricelistService = new PricelistService(req.db);
                pricelists = await pricelistService.fetchPricelists();
            } else {
                // Non-admin users: only pricelists linked to their assigned stations
                // Query: user_station -> station -> pricelist
                const rawPricelists = await req.db
                    .createQueryBuilder()
                    .select([
                        "pricelist.id",
                        "pricelist.name",
                        "pricelist.status",
                        "pricelist.is_default",
                        "station.id",
                        "station.name"
                    ])
                    .from("pricelist", "pricelist")
                    .innerJoin("pricelist.station", "station")
                    .innerJoin("user_station", "user_station", "user_station.station_id = station.id")
                    .where("user_station.user_id = :userId", { userId: parseInt(userId) })
                    .andWhere("user_station.status = :status", { status: "enabled" })
                    .orderBy("pricelist.is_default", "DESC")
                    .addOrderBy("pricelist.name", "ASC")
                    .getRawMany();

                // Transform the raw results to match expected format
                pricelists = rawPricelists.map(row => ({
                    id: row.pricelist_id,
                    name: row.pricelist_name,
                    status: row.pricelist_status,
                    is_default: row.pricelist_is_default,
                    station_id: row.station_id,
                    station_name: row.station_name
                }));

                console.log(`Non-admin user ${userId} can access ${pricelists.length} pricelists through station assignments`);
            }

            console.log(`Returning ${pricelists.length} pricelists for user ${userId}`);
            res.status(200).json(pricelists);
        } catch (error: any) {
            console.error("Error fetching available pricelists:", error);
            res.status(500).json({
                message: "Error fetching available pricelists",
                error: error.message,
            });
        }
    } else {
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);