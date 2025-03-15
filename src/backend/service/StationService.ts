import { AppDataSource } from "@backend/config/data-source";
import { Station, StationStatus } from "@backend/entities/Station";
import Container, { Inject } from "typedi";
import { DataSource, Repository } from "typeorm";

export class StationService {
    private stationRepository: Repository<Station>;
     private dataSource = Container.get<DataSource>('DATA_SOURCE');
    
        constructor() {
        this.stationRepository = this.dataSource.getRepository(Station);
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