import permissions from "@backend/config/permissions";
import { fetchStationUsersHandler } from "@backend/controllers/StationController";
import { authMiddleware, authorize } from "@backend/middleware/auth";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { StationService } from "@backend/service/StationService";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { stationId } = req.query;

    if (!stationId || isNaN(Number(stationId))) {
        return res.status(400).json({ message: "Invalid station ID" });
    }

    const stationService = new StationService(req.db);

    try {
        switch (req.method) {
            case "GET":
                await authorize([permissions.CAN_VIEW_STATION])(fetchStationUsersHandler)(req, res);
                break;

            case "POST":
                // Add a user to a station
                await authorize([permissions.CAN_EDIT_USER_STATION])(async (req, res) => {
                    const { userId } = req.body;

                    if (!userId || isNaN(Number(userId))) {
                        return res.status(400).json({ message: "Invalid user ID" });
                    }

                    await stationService.addUserToStation(
                        Number(stationId),
                        Number(userId)
                    );

                    res.status(200).json({
                        message: "User added to station successfully"
                    });
                })(req, res);
                break;

            case "DELETE":
                // Remove a user from a station
                await authorize([permissions.CAN_EDIT_USER_STATION])(async (req, res) => {
                    const { userId } = req.query;

                    if (!userId || isNaN(Number(userId))) {
                        return res.status(400).json({ message: "Invalid user ID" });
                    }

                    await stationService.removeUserFromStation(
                        Number(stationId),
                        Number(userId)
                    );

                    res.status(200).json({
                        message: "User removed from station successfully"
                    });
                })(req, res);
                break;

            case "PATCH":
                // Activate/Deactivate a user for a station
                await authorize([permissions.CAN_EDIT_USER_STATION])(async (req, res) => {
                    const { userId, action } = req.body;

                    if (!userId || isNaN(Number(userId))) {
                        return res.status(400).json({ message: "Invalid user ID" });
                    }

                    if (action === "deactivate") {
                        await stationService.disableUserFromStation(
                            Number(stationId),
                            Number(userId)
                        );
                        res.status(200).json({
                            message: "User deactivated for station successfully"
                        });
                    } else if (action === "activate") {
                        await stationService.enableUserForStation(
                            Number(stationId),
                            Number(userId)
                        );
                        res.status(200).json({
                            message: "User activated for station successfully"
                        });
                    } else {
                        res.status(400).json({ message: "Invalid action. Use 'activate' or 'deactivate'" });
                    }
                })(req, res);
                break;

            default:
                res.setHeader("Allow", ["GET", "POST", "DELETE", "PATCH"]);
                res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error: any) {
        console.error("Station user management error:", error);
        res.status(500).json({ message: "Some error occurred. Please try again." });
    }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);
