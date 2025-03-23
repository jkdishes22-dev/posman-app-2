import { AppDataSource } from "@backend/config/data-source";
import { Station, StationStatus } from "@backend/entities/Station";
import { DataSource, Repository } from "typeorm";

export class StationService {
    private stationRepository: Repository<Station>;

    constructor(datasource: DataSource) {
        this.stationRepository = datasource.getRepository(Station);
    }

    async createStation(station: Station) {
        const updatedRequest = {
            ...station,
            status: StationStatus.ENABLED
        }
        const newStation = this.stationRepository.create(updatedRequest);
        return await this.stationRepository.save(newStation);
    }

    async fetchStations(options: Record<string, any>) {
        return await this.stationRepository.find({
            where: {
                status: options.status
            }
        });
    }

    async fetchStationPricelist(stationId: number) {
        const query = `
        SELECT 
            s.id,
            s.name,
            p.*
        FROM 
          station s
        JOIN pricelist p ON p.station_id = s.id
        WHERE 
          s.id = ?
      `;
        return await AppDataSource.query(query, [stationId]);
    }
}