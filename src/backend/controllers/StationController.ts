import { StationService } from "@backend/service/StationService";
import { NextApiRequest, NextApiResponse } from "next";
import { handleApiError } from "@backend/utils/errorHandler";
import logger from "@backend/utils/logger";

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

export const deleteStationHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const stationService = new StationService(req.db);
  const { stationId } = req.query;

  try {
    await stationService.deleteStation(Number(stationId));
    logger.info({ stationId, userId: req.user?.id }, "Station deleted");
    res.status(200).json({ message: "Station deleted successfully" });
  } catch (error: any) {
    if (error?.message === "Station not found") {
      return res.status(404).json({ error: "Station not found" });
    }
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "deleting",
      resource: "station",
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const updateStationHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const stationService = new StationService(req.db);
  const { stationId } = req.query;
  const { name, description } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Station name is required" });
  }

  try {
    await stationService.updateStation(Number(stationId), {
      name: name.trim(),
      description: description ?? undefined,
    });
    logger.info({ stationId, userId: req.user?.id }, "Station updated");
    res.status(200).json({ message: "Station updated successfully" });
  } catch (error: any) {
    if (error?.message === "Station not found") {
      return res.status(404).json({ error: "Station not found" });
    }
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "updating",
      resource: "station",
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};
