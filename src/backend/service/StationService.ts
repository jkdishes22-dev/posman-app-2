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
    const queryBuilder = this.stationRepository.createQueryBuilder("station");

    if (options.status) {
      queryBuilder.where("station.status = :status", { status: options.status });
    }

    return await queryBuilder
      .select(["station.id", "station.name", "station.status"])
      .orderBy("station.name", "ASC")
      .getMany();
  }

  async getEnabledStations() {
    return await this.fetchStations({ status: StationStatus.ENABLED });
  }

  async getAllStations() {
    return await this.fetchStations({});
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

  // Set a pricelist as default for a station
  async setDefaultPricelist(stationId: number, pricelistId: number): Promise<void> {
    // First, unset any existing default pricelist for this station
    await this.pricelistRepository.update(
      { station: { id: stationId }, is_default: 1 },
      { is_default: 0 }
    );

    // Set the new pricelist as default
    const result = await this.pricelistRepository.update(
      { id: pricelistId, station: { id: stationId } },
      { is_default: 1 }
    );

    if (result.affected === 0) {
      throw new Error("Pricelist not found or not linked to this station");
    }
  }

  // Remove default pricelist for a station
  async removeDefaultPricelist(stationId: number): Promise<void> {
    await this.pricelistRepository.update(
      { station: { id: stationId }, is_default: 1 },
      { is_default: 0 }
    );
  }

  // User management methods

  /**
   * Add a user to a station (gives them permission to bill at this station)
   */
  async addUserToStation(stationId: number, userId: number): Promise<void> {
    // Check if user is already linked to this station
    const existingLink = await this.userStationRepository.findOne({
      where: {
        station: { id: stationId },
        user: { id: userId }
      }
    });

    if (existingLink) {
      throw new Error("User is already linked to this station");
    }

    // Create new user-station link
    const userStation = this.userStationRepository.create({
      station: { id: stationId },
      user: { id: userId },
      status: UserStationStatus.ENABLED,
      isDefault: false // Always false since there's no concept of default user
    });

    await this.userStationRepository.save(userStation);
  }

  /**
   * Remove a user from a station
   */
  async removeUserFromStation(stationId: number, userId: number): Promise<void> {
    const result = await this.userStationRepository.delete({
      station: { id: stationId },
      user: { id: userId }
    });

    if (result.affected === 0) {
      throw new Error("User is not linked to this station");
    }
  }

  /**
   * Disable a user from a station (keeps them linked but disabled)
   */
  async disableUserFromStation(stationId: number, userId: number): Promise<void> {
    const result = await this.userStationRepository.update(
      { station: { id: stationId }, user: { id: userId } },
      { status: UserStationStatus.DISABLED }
    );

    if (result.affected === 0) {
      throw new Error("User is not linked to this station");
    }
  }

  /**
   * Enable a user for a station
   */
  async enableUserForStation(stationId: number, userId: number): Promise<void> {
    const result = await this.userStationRepository.update(
      { station: { id: stationId }, user: { id: userId } },
      { status: UserStationStatus.ENABLED }
    );

    if (result.affected === 0) {
      throw new Error("User is not linked to this station");
    }
  }


  /**
   * Get available users (not yet linked to this station)
   * Only returns users with 'waiter' or 'admin' roles who are not locked
   */
  async getAvailableUsers(stationId: number): Promise<any[]> {
    const query = `
      SELECT DISTINCT
        u.id,
        u.firstName,
        u.lastName,
        u.username,
        r.name as role_name
      FROM \`user\` u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE u.id NOT IN (
        SELECT us.user_id 
        FROM user_station us 
        WHERE us.station_id = ?
      )
      AND r.name IN ('waiter', 'admin')
      AND (u.is_locked IS NULL OR u.is_locked = 0)
      ORDER BY u.firstName, u.lastName
    `;

    return await AppDataSource.query(query, [stationId]);
  }
}
