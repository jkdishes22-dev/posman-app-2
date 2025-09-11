import { AppDataSource } from "@backend/config/data-source";
import { Station, StationStatus } from "@backend/entities/Station";
import { Pricelist, PriceListStatus } from "@backend/entities/Pricelist";
import { UserStation, UserStationStatus } from "@backend/entities/UserStation";
import { DataSource, Repository } from "typeorm";

export class StationService {
  private stationRepository: Repository<Station>;
  private pricelistRepository: Repository<Pricelist>;
  private userStationRepository: Repository<UserStation>;

  constructor(datasource: DataSource) {
    this.stationRepository = datasource.getRepository(Station);
    this.pricelistRepository = datasource.getRepository(Pricelist);
    this.userStationRepository = datasource.getRepository(UserStation);
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

  // New methods for default station and pricelist management

  /**
   * Get user's default station
   */
  async getUserDefaultStation(userId: number): Promise<Station | null> {
    const userStation = await this.userStationRepository.findOne({
      where: {
        user: { id: userId },
        isDefault: true,
        status: UserStationStatus.ENABLED
      },
      relations: ["station"]
    });

    return userStation?.station || null;
  }

  /**
   * Set user's default station
   */
  async setUserDefaultStation(userId: number, stationId: number): Promise<void> {
    // First, unset any existing default for this user
    await this.userStationRepository.update(
      { user: { id: userId } },
      { isDefault: false }
    );

    // Set the new default
    await this.userStationRepository.update(
      { user: { id: userId }, station: { id: stationId } },
      { isDefault: true }
    );
  }

  /**
   * Get station's default pricelist
   */
  async getStationDefaultPricelist(stationId: number): Promise<Pricelist | null> {
    return await this.pricelistRepository.findOne({
      where: {
        station: { id: stationId },
        is_default: true
      }
    });
  }

  /**
   * Set station's default pricelist
   */
  async setStationDefaultPricelist(stationId: number, pricelistId: number): Promise<void> {
    // First, unset any existing default for this station
    await this.pricelistRepository.update(
      { station: { id: stationId } },
      { is_default: false }
    );

    // Set the new default
    await this.pricelistRepository.update(
      { id: pricelistId, station: { id: stationId } },
      { is_default: true }
    );
  }

  /**
   * Create a default pricelist for a station
   */
  async createDefaultPricelistForStation(stationId: number, pricelistName?: string): Promise<Pricelist> {
    const station = await this.stationRepository.findOne({ where: { id: stationId } });
    if (!station) {
      throw new Error(`Station with ID ${stationId} not found`);
    }

    const defaultPricelist = this.pricelistRepository.create({
      name: pricelistName || `${station.name} - Default`,
      station: { id: stationId },
      is_default: true,
      status: PriceListStatus.ACTIVE
    });

    return await this.pricelistRepository.save(defaultPricelist);
  }

  /**
   * Validate if user can bill at station
   */
  async validateUserStationAccess(userId: number, stationId: number): Promise<boolean> {
    const userStation = await this.userStationRepository.findOne({
      where: {
        user: { id: userId },
        station: { id: stationId },
        status: UserStationStatus.ENABLED
      }
    });

    return !!userStation;
  }

  /**
   * Get user's available stations
   */
  async getUserStations(userId: number): Promise<Station[]> {
    const userStations = await this.userStationRepository.find({
      where: {
        user: { id: userId },
        status: UserStationStatus.ENABLED
      },
      relations: ["station"]
    });

    return userStations.map(us => us.station);
  }

  // Link a pricelist to a station
  async linkPricelistToStation(stationId: number, pricelistId: number): Promise<void> {
    const pricelist = await this.pricelistRepository.findOne({
      where: { id: pricelistId }
    });

    if (!pricelist) {
      throw new Error("Pricelist not found");
    }

    // Update the pricelist to link it to the station
    pricelist.station = { id: stationId } as any;
    await this.pricelistRepository.save(pricelist);
  }

  // Unlink a pricelist from a station
  async unlinkPricelistFromStation(stationId: number, pricelistId: number): Promise<void> {
    const pricelist = await this.pricelistRepository.findOne({
      where: { id: pricelistId, station: { id: stationId } }
    });

    if (!pricelist) {
      throw new Error("Pricelist not found or not linked to this station");
    }

    // Remove the station link
    pricelist.station = null;
    await this.pricelistRepository.save(pricelist);
  }
}
