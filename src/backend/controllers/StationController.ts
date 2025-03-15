import { StationService } from "@backend/service/StationService";
import { NextApiRequest, NextApiResponse } from "next";
import Container from "typedi";

const stationService = Container.get(StationService);

export const addStationHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const request = req.body;
        const newStation = await stationService.createStation(request);
        res.status(201).json(newStation);
    } catch (error) {
        res.status(500).json({ message: "Error fetching scopes", error });
    }
};

export const fetchStationsHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const criteria = {
            status: req.query.status
        };
        const stations = await stationService.fetchStations(criteria);
        res.status(200).json(stations);
    } catch (error) {
        res.status(500).json({ message: "Error fetching stations", error });
    }
};

export const fetchStationPricelistHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const { stationId } = req.query;
        const stationPricelist = await stationService.fetchStationPricelist(Number(stationId));
        res.status(200).json(stationPricelist);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching station pricelist",
            error
        })
    }

};