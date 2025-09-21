import { NextApiRequest, NextApiResponse } from "next";
import { authMiddleware } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { PricelistService } from "@backend/service/PricelistService";
import { UserStation } from "@backend/entities/UserStation";
import logger from "@backend/utils/logger";

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
            logger.info({ userId, userRoles, isAdmin }, 'User accessing pricelists');


            let pricelists = [];

            if (isAdmin) {
                // Admins can see all pricelists (use the admin endpoint logic)
                const pricelistService = new PricelistService(req.db);
                pricelists = await pricelistService.fetchPricelists();
            } else {
                // Non-admin users: only pricelists linked to their assigned stations
                // Query: user_station -> station -> station_pricelist -> pricelist
                // Return ALL pricelists accessible to the user (not filtered by stationId parameter)
                const rawPricelists = await req.db
                    .createQueryBuilder()
                    .select([
                        "pricelist.id as pricelist_id",
                        "pricelist.name as pricelist_name",
                        "pricelist.status as pricelist_status",
                        "pricelist.is_default as pricelist_is_default",
                        "pricelist.description as pricelist_description",
                        "station.id as station_id",
                        "station.name as station_name"
                    ])
                    .from("pricelist", "pricelist")
                    .innerJoin("station_pricelist", "sp", "sp.pricelist_id = pricelist.id")
                    .innerJoin("station", "station", "station.id = sp.station_id")
                    .innerJoin("user_station", "user_station", "user_station.station_id = station.id")
                    .where("user_station.user_id = :userId", { userId: parseInt(userId) })
                    .andWhere("user_station.status = :status", { status: "active" })
                    .andWhere("sp.status = :pricelistStatus", { pricelistStatus: "active" })
                    .orderBy("pricelist.is_default", "DESC")
                    .addOrderBy("pricelist.name", "ASC")
                    .getRawMany();

                // Transform the raw results to match expected format
                pricelists = rawPricelists.map(row => ({
                    id: row.pricelist_id,
                    name: row.pricelist_name,
                    status: row.pricelist_status,
                    is_default: row.pricelist_is_default,
                    description: row.pricelist_description,
                    station: {
                        id: row.station_id,
                        name: row.station_name
                    }
                }));
            }

            logger.info({ userId, pricelistCount: pricelists.length, isAdmin }, 'Returning pricelists to user');
            res.status(200).json({
                message: "Pricelists fetched successfully",
                pricelists
            });
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