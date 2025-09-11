import { StationService } from "@backend/service/StationService";
import { NextApiRequest, NextApiResponse } from "next";

export const addStationHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const stationService = new StationService(req.db);
  try {
    const request = req.body;
    const newStation = await stationService.createStation(request);
    res.status(201).json(newStation);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching scopes", error });
  }
};

export const fetchStationsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const stationService = new StationService(req.db);
  try {
    const criteria = {
      status: req.query.status,
    };
    const stations = await stationService.fetchStations(criteria);
    res.status(200).json(stations);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching stations", error });
  }
};

export const fetchStationPricelistHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const stationService = new StationService(req.db);
  try {
    const { stationId } = req.query;
    const stationPricelist = await stationService.fetchStationPricelist(
      Number(stationId),
    );
    res.status(200).json(stationPricelist);
  } catch (error: any) {
    res.status(500).json({
      message: "Error fetching station pricelist",
      error,
    });
  }
};

export const fetchStationUsersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const stationService = new StationService(req.db);
  try {
    const { stationId } = req.query;
    console.log("Fetching users for station ID:", stationId);
    const stationUsers = await stationService.fetchStationUsers(
      Number(stationId),
    );
    console.log("Station users result:", stationUsers);
    res.status(200).json(stationUsers);
  } catch (error: any) {
    console.error("Error in fetchStationUsersHandler:", error);
    res.status(500).json({
      message: "Error fetching station users",
      error: error.message,
    });
  }
};
