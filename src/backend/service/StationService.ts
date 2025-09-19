import { AppDataSource } from "@backend/config/data-source";
import { Station, StationStatus } from "@backend/entities/Station";
import { Pricelist, PriceListStatus } from "@backend/entities/Pricelist";
import { StationPricelist, StationPricelistStatus } from "@backend/entities/StationPricelist";
import { UserStation, UserStationStatus } from "@backend/entities/UserStation";
import { DataSource, Repository } from "typeorm";

export class StationService {
  private stationRepository: Repository<Station>;
  private pricelistRepository: Repository<Pricelist>;
  private stationPricelistRepository: Repository<StationPricelist>;
  private userStationRepository: Repository<UserStation>;

  constructor(datasource: DataSource) {
    this.stationRepository = datasource.getRepository(Station);
    this.pricelistRepository = datasource.getRepository(Pricelist);
    this.stationPricelistRepository = datasource.getRepository(StationPricelist);
    this.userStationRepository = datasource.getRepository(UserStation);
  }

  async createStation(station: Station) {
    const updatedRequest = {
      ...station,
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
    const result = await AppDataSource.query(query, [stationId]);
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
        status: UserStationStatus.ACTIVE
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
   * Get station's default pricelist (legacy method - use getDefaultPricelistForStation instead)
   */
  async getStationDefaultPricelist(stationId: number): Promise<Pricelist | null> {
    const defaultPricelist = await this.getDefaultPricelistForStation(stationId);
    if (!defaultPricelist) {
      return null;
    }

    return await this.pricelistRepository.findOne({
      where: { id: defaultPricelist.id }
    });
  }

  /**
   * Set station's default pricelist (legacy method - use setDefaultPricelist instead)
   */
  async setStationDefaultPricelist(stationId: number, pricelistId: number): Promise<void> {
    return await this.setDefaultPricelist(stationId, pricelistId);
  }

  /**
   * Create a default pricelist for a station
   */
  async createDefaultPricelistForStation(stationId: number, pricelistName?: string): Promise<Pricelist> {
    const station = await this.stationRepository.findOne({ where: { id: stationId } });
    if (!station) {
      throw new Error(`Station with ID ${stationId} not found`);
    }

    // Create the pricelist
    const defaultPricelist = this.pricelistRepository.create({
      name: pricelistName || `${station.name} - Default`,
      is_default: true,
      status: PriceListStatus.ACTIVE
    });

    const savedPricelist = await this.pricelistRepository.save(defaultPricelist);

    // Link it to the station as default
    await this.linkPricelistToStation(stationId, savedPricelist.id);
    await this.setDefaultPricelist(stationId, savedPricelist.id);

    return savedPricelist;
  }

  /**
   * Validate if user can bill at station
   */
  async validateUserStationAccess(userId: number, stationId: number): Promise<boolean> {
    const userStation = await this.userStationRepository.findOne({
      where: {
        user: { id: userId },
        station: { id: stationId },
        status: UserStationStatus.ACTIVE
      }
    });

    return !!userStation;
  }

  /**
   * Get user's available stations
   */
  async getUserStations(userId: number): Promise<Station[]> {
    // Get all user stations and filter by status
    const allUserStations = await this.userStationRepository.find({
      where: {
        user: { id: userId }
      },
      relations: ["station"]
    });

    // Filter by status
    const activeUserStations = allUserStations.filter(us => us.status === UserStationStatus.ACTIVE);

    return activeUserStations.map(us => us.station);
  }

  // Link a pricelist to a station
  async linkPricelistToStation(stationId: number, pricelistId: number, notes?: string): Promise<void> {
    // Check if pricelist exists
    const pricelist = await this.pricelistRepository.findOne({
      where: { id: pricelistId }
    });

    if (!pricelist) {
      throw new Error("Pricelist not found");
    }

    // Check if station exists
    const station = await this.stationRepository.findOne({
      where: { id: stationId }
    });

    if (!station) {
      throw new Error("Station not found");
    }

    // Check if relationship already exists
    const existingRelation = await this.stationPricelistRepository.findOne({
      where: { station: { id: stationId }, pricelist: { id: pricelistId } }
    });

    if (existingRelation) {
      throw new Error("Pricelist is already linked to this station");
    }

    // Create the relationship
    const stationPricelist = this.stationPricelistRepository.create({
      station: { id: stationId },
      pricelist: { id: pricelistId },
      status: StationPricelistStatus.ACTIVE,
      notes: notes || null
    });

    await this.stationPricelistRepository.save(stationPricelist);
  }

  // Unlink a pricelist from a station
  async unlinkPricelistFromStation(stationId: number, pricelistId: number): Promise<void> {
    const result = await this.stationPricelistRepository.delete({
      station: { id: stationId },
      pricelist: { id: pricelistId }
    });

    if (result.affected === 0) {
      throw new Error("Pricelist not found or not linked to this station");
    }
  }

  // Set a pricelist as default for a station
  async setDefaultPricelist(stationId: number, pricelistId: number): Promise<void> {
    // First, unset any existing default pricelist for this station
    await this.stationPricelistRepository.update(
      { station: { id: stationId }, is_default: true },
      { is_default: false }
    );

    // Set the new pricelist as default
    const result = await this.stationPricelistRepository.update(
      { station: { id: stationId }, pricelist: { id: pricelistId } },
      { is_default: true }
    );

    if (result.affected === 0) {
      throw new Error("Pricelist not found or not linked to this station");
    }
  }

  // Remove default pricelist for a station
  async removeDefaultPricelist(stationId: number): Promise<void> {
    await this.stationPricelistRepository.update(
      { station: { id: stationId }, is_default: true },
      { is_default: false }
    );
  }

  // Get all pricelists for a station
  async getPricelistsForStation(stationId: number): Promise<any[]> {
    const stationPricelists = await this.stationPricelistRepository.find({
      where: { station: { id: stationId } },
      relations: ["pricelist"],
      order: { is_default: "DESC", created_at: "ASC" }
    });

    return stationPricelists.map(sp => ({
      id: sp.pricelist.id,
      name: sp.pricelist.name,
      status: sp.pricelist.status,
      is_default: sp.is_default,
      station_pricelist_status: sp.status,
      notes: sp.notes,
      created_at: sp.created_at,
      updated_at: sp.updated_at
    }));
  }

  // Get default pricelist for a station
  async getDefaultPricelistForStation(stationId: number): Promise<any | null> {
    const defaultPricelist = await this.stationPricelistRepository.findOne({
      where: {
        station: { id: stationId },
        is_default: true,
        status: StationPricelistStatus.ACTIVE
      },
      relations: ["pricelist"]
    });

    if (!defaultPricelist) {
      return null;
    }

    return {
      id: defaultPricelist.pricelist.id,
      name: defaultPricelist.pricelist.name,
      status: defaultPricelist.pricelist.status,
      is_default: true,
      station_pricelist_status: defaultPricelist.status,
      notes: defaultPricelist.notes
    };
  }

  // Update pricelist status for a station
  async updatePricelistStatusForStation(
    stationId: number,
    pricelistId: number,
    status: StationPricelistStatus,
    notes?: string
  ): Promise<void> {
    const result = await this.stationPricelistRepository.update(
      { station: { id: stationId }, pricelist: { id: pricelistId } },
      {
        status,
        notes: notes || undefined
      }
    );

    if (result.affected === 0) {
      throw new Error("Pricelist not found or not linked to this station");
    }
  }

  // Get all stations using a pricelist
  async getStationsUsingPricelist(pricelistId: number): Promise<any[]> {
    const stationPricelists = await this.stationPricelistRepository.find({
      where: { pricelist: { id: pricelistId } },
      relations: ["station"],
      order: { created_at: "ASC" }
    });

    return stationPricelists.map(sp => ({
      id: sp.station.id,
      name: sp.station.name,
      status: sp.station.status,
      is_default: sp.is_default,
      station_pricelist_status: sp.status,
      notes: sp.notes,
      linked_at: sp.created_at
    }));
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
   * Deactivate a user from a station (keeps them linked but inactive)
   */
  async disableUserFromStation(stationId: number, userId: number): Promise<void> {
    const result = await this.userStationRepository.update(
      { station: { id: stationId }, user: { id: userId } },
      { status: UserStationStatus.INACTIVE }
    );

    if (result.affected === 0) {
      throw new Error("User is not linked to this station");
    }
  }

  /**
   * Activate a user for a station
   */
  async enableUserForStation(stationId: number, userId: number): Promise<void> {
    const result = await this.userStationRepository.update(
      { station: { id: stationId }, user: { id: userId } },
      { status: UserStationStatus.ACTIVE }
    );

    if (result.affected === 0) {
      throw new Error("User is not linked to this station");
    }
  }


  /**
   * Get available users (not yet linked to this station)
   * Only returns users with 'waiter', 'supervisor', or 'admin' roles who are not locked
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
      AND r.name IN ('waiter', 'supervisor', 'admin')
      AND (u.is_locked IS NULL OR u.is_locked = 0)
      ORDER BY u.firstName, u.lastName
    `;

    return await AppDataSource.query(query, [stationId]);
  }

  async getStationById(id: number): Promise<Station | null> {
    return await this.stationRepository.findOne({
      where: { id },
      relations: ["stationPricelists", "stationPricelists.pricelist"],
    });
  }

  async updateStationStatus(id: number, status: string): Promise<void> {
    await this.stationRepository.update(id, { status });
  }
}
