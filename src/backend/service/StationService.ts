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
      status: StationStatus.ENABLED,
    };
    const newStation = this.stationRepository.create(updatedRequest);
    return await this.stationRepository.save(newStation);
  }

  async fetchStations(options: Record<string, any>) {
    return await this.stationRepository.find({
      where: {
        status: options.status,
      },
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

  async fetchStationUsers(stationId: number) {
    console.log("StationService: fetchStationUsers called with stationId:", stationId);
    const query = `
        SELECT 
            u.id,
            u.firstName,
            u.lastName,
            u.username,
            us.status,
            us.is_default
        FROM 
          station s
        JOIN user_station us ON us.station_id = s.id
        JOIN \`user\` u ON u.id = us.user_id
        WHERE 
          s.id = ?
      `;
    console.log("StationService: Executing query:", query);
    console.log("StationService: With parameters:", [stationId]);
    const result = await AppDataSource.query(query, [stationId]);
    console.log("StationService: Query result:", result);
    return result;
  }
}
