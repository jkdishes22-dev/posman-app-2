import { StationService } from "@backend/service/StationService";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";

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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "creating",
      resource: "station"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "stations"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
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
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "station pricelist"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const fetchStationUsersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const stationService = new StationService(req.db);
  try {
    const { stationId } = req.query;
    const stationUsers = await stationService.fetchStationUsers(
      Number(stationId),
    );
    res.status(200).json(stationUsers);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "station users"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};
