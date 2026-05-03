import { AppDataSource } from "@backend/config/data-source";
import { Station, StationStatus } from "@backend/entities/Station";
import { Pricelist, PriceListStatus } from "@backend/entities/Pricelist";
import { StationPricelist, StationPricelistStatus } from "@backend/entities/StationPricelist";
import { UserStation, UserStationStatus } from "@backend/entities/UserStation";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";
import { assignBaseEntityDates } from "@backend/utils/sqlEntityMappers";

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
    const saved = await this.stationRepository.save(newStation);

    // Invalidate cache after creating station
    cache.invalidate("stations");

    return saved;
  }

  async fetchStations(options: Record<string, any>) {
    const cacheKey = `stations_${JSON.stringify(options)}`;

    // Try cache first
    const cached = cache.get<Station[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const queryBuilder = this.stationRepository.createQueryBuilder("station");

    if (options.status) {
      queryBuilder.where("station.status = :status", { status: options.status });
    }

    const result = await queryBuilder
      .select(["station.id", "station.name", "station.status"])
      .orderBy("station.name", "ASC")
      .getMany();

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async getEnabledStations() {
    return await this.fetchStations({ status: StationStatus.ACTIVE });
  }

  async getAllStations() {
    return await this.fetchStations({});
  }

  async fetchStationPricelist(stationId: number) {
    const cacheKey = `station_pricelist_${stationId}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

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
    const result = await AppDataSource.query(query, [stationId]);

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async fetchStationUsers(stationId: number) {
    const cacheKey = `station_users_${stationId}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

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
        JOIN "user" u ON u.id = us.user_id
        WHERE
          s.id = ?
      `;
    const result = await AppDataSource.query(query, [stationId]);

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  // New methods for default station and pricelist management

  /**
   * Map a station row from raw SQL into a Station-shaped object (avoids TypeORM relation
   * hydration bugs with better-sqlite3 in some standalone builds).
   */
  private mapRowToStation(row: Record<string, unknown>): Station {
    const s = new Station();
    s.id = Number(row.id);
    s.name = String(row.name ?? "");
    s.status = (row.status as StationStatus) ?? StationStatus.INACTIVE;
    s.description = row.description != null ? String(row.description) : "";
    assignBaseEntityDates(s, row.created_at, row.updated_at);
    if (row.created_by != null) s.created_by = Number(row.created_by);
    if (row.updated_by != null) s.updated_by = Number(row.updated_by);
    return s;
  }

  /**
   * Get user's default station
   */
  async getUserDefaultStation(userId: number): Promise<Station | null> {
    const cacheKey = `user_default_station_${userId}`;

    // Try cache first
    const cached = cache.get<Station | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const rows = (await this.userStationRepository.manager.query(
        `
        SELECT s.id, s.name, s.status, s.description, s.created_at, s.updated_at, s.created_by, s.updated_by
        FROM user_station us
        INNER JOIN station s ON s.id = us.station_id
        WHERE us.user_id = ?
          AND us.is_default = 1
          AND us.status = ?
          AND s.status = ?
        LIMIT 1
      `,
        [userId, UserStationStatus.ACTIVE, StationStatus.ACTIVE],
      )) as Record<string, unknown>[];

      const result =
        rows?.length > 0 ? this.mapRowToStation(rows[0]) : null;

      // Cache the result
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Error fetching user default station:", error);
      // Return null instead of throwing to prevent cascading failures
      return null;
    }
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

    // Invalidate cache
    cache.invalidate(`user_default_station_${userId}`);
    cache.invalidate("user_stations");
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
   * Get user's available stations (raw SQL — stable with better-sqlite3 / bundled server).
   */
  async getUserStations(userId: number): Promise<Station[]> {
    const cacheKey = `user_stations_${userId}`;

    // Try cache first
    const cached = cache.get<Station[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const rows = (await this.userStationRepository.manager.query(
        `
        SELECT s.id, s.name, s.status, s.description, s.created_at, s.updated_at, s.created_by, s.updated_by
        FROM user_station us
        INNER JOIN station s ON s.id = us.station_id
        WHERE us.user_id = ? AND us.status = ?
        ORDER BY s.name ASC
      `,
        [userId, UserStationStatus.ACTIVE],
      )) as Record<string, unknown>[];

      const result = Array.isArray(rows) ? rows.map((r) => this.mapRowToStation(r)) : [];

      // Cache the result (15 min TTL — user-station assignments rarely change mid-session)
      cache.set(cacheKey, result, 900000);
      return result;
    } catch (error) {
      console.error("Error fetching user stations:", error);
      return [];
    }
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

    // Invalidate cache
    cache.invalidate(`station_pricelists_${stationId}`);
    cache.invalidate(`station_default_pricelist_${stationId}`);
    cache.invalidate(`pricelist_stations_${pricelistId}`);
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

    // Invalidate cache
    cache.invalidate(`station_pricelists_${stationId}`);
    cache.invalidate(`station_default_pricelist_${stationId}`);
    cache.invalidate(`pricelist_stations_${pricelistId}`);
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

    // Invalidate cache
    cache.invalidate(`station_pricelists_${stationId}`);
    cache.invalidate(`station_default_pricelist_${stationId}`);
    cache.invalidate(`pricelist_stations_${pricelistId}`);
  }

  // Remove default pricelist for a station
  async removeDefaultPricelist(stationId: number): Promise<void> {
    await this.stationPricelistRepository.update(
      { station: { id: stationId }, is_default: true },
      { is_default: false }
    );

    // Invalidate cache
    cache.invalidate(`station_pricelists_${stationId}`);
    cache.invalidate(`station_default_pricelist_${stationId}`);
  }

  // Get all pricelists for a station
  async getPricelistsForStation(stationId: number): Promise<any[]> {
    const cacheKey = `station_pricelists_${stationId}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const stationPricelists = await this.stationPricelistRepository.find({
      where: { station: { id: stationId } },
      relations: ["pricelist"],
      order: { is_default: "DESC", created_at: "ASC" }
    });

    const result = stationPricelists.map(sp => ({
      id: sp.pricelist.id,
      name: sp.pricelist.name,
      status: sp.pricelist.status,
      is_default: sp.is_default,
      station_pricelist_status: sp.status,
      notes: sp.notes,
      created_at: sp.created_at,
      updated_at: sp.updated_at
    }));

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  // Get default pricelist for a station
  async getDefaultPricelistForStation(stationId: number): Promise<any | null> {
    const cacheKey = `station_default_pricelist_${stationId}`;

    // Try cache first
    const cached = cache.get<any | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const defaultPricelist = await this.stationPricelistRepository.findOne({
      where: {
        station: { id: stationId },
        is_default: true,
        status: StationPricelistStatus.ACTIVE
      },
      relations: ["pricelist"]
    });

    if (!defaultPricelist) {
      cache.set(cacheKey, null);
      return null;
    }

    const result = {
      id: defaultPricelist.pricelist.id,
      name: defaultPricelist.pricelist.name,
      status: defaultPricelist.pricelist.status,
      is_default: true,
      station_pricelist_status: defaultPricelist.status,
      notes: defaultPricelist.notes
    };

    // Cache the result
    cache.set(cacheKey, result);
    return result;
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

    // Invalidate cache
    cache.invalidate(`station_pricelists_${stationId}`);
    cache.invalidate(`station_default_pricelist_${stationId}`);
    cache.invalidate(`pricelist_stations_${pricelistId}`);
  }

  // Get all stations using a pricelist
  async getStationsUsingPricelist(pricelistId: number): Promise<any[]> {
    const cacheKey = `pricelist_stations_${pricelistId}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const stationPricelists = await this.stationPricelistRepository.find({
      where: { pricelist: { id: pricelistId } },
      relations: ["station"],
      order: { created_at: "ASC" }
    });

    const result = stationPricelists.map(sp => ({
      id: sp.station.id,
      name: sp.station.name,
      status: sp.station.status,
      is_default: sp.is_default,
      station_pricelist_status: sp.status,
      notes: sp.notes,
      linked_at: sp.created_at
    }));

    // Cache the result
    cache.set(cacheKey, result);
    return result;
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
      status: UserStationStatus.ACTIVE,
      isDefault: false // Always false since there's no concept of default user
    });

    await this.userStationRepository.save(userStation);

    // Invalidate cache
    cache.invalidate(`station_users_${stationId}`);
    cache.invalidate("user_stations");
    cache.invalidate("available_users_station");
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

    // Invalidate cache
    cache.invalidate(`station_users_${stationId}`);
    cache.invalidate("user_stations");
    cache.invalidate("available_users_station");
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

    // Invalidate cache
    cache.invalidate(`station_users_${stationId}`);
    cache.invalidate("user_stations");
    cache.invalidate("available_users_station");
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

    // Invalidate cache
    cache.invalidate(`station_users_${stationId}`);
    cache.invalidate("user_stations");
    cache.invalidate("available_users_station");
  }


  /**
   * Get available users (not yet linked to this station)
   * Only returns users with 'sales', 'admin', or 'supervisor' roles who are not locked
   */
  async getAvailableUsers(stationId: number): Promise<any[]> {
    const cacheKey = `available_users_station_${stationId}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const query = `
      SELECT DISTINCT
        u.id,
        u.firstName,
        u.lastName,
        u.username,
        r.name as role_name
      FROM "user" u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE u.id NOT IN (
        SELECT us.user_id 
        FROM user_station us 
        WHERE us.station_id = ?
      )
      AND r.name IN ('sales', 'admin', 'supervisor')
      AND (u.is_locked IS NULL OR u.is_locked = 0)
      ORDER BY u.firstName, u.lastName
    `;

    const result = await AppDataSource.query(query, [stationId]);

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async getStationById(id: number): Promise<Station | null> {
    const cacheKey = `station_${id}`;

    // Try cache first
    const cached = cache.get<Station | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Optimized: Only select needed fields, avoid loading full relations
    const result = await this.stationRepository.findOne({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        created_at: true,
        updated_at: true
      }
    });

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async updateStationStatus(id: number, status: string): Promise<void> {
    await this.stationRepository.update(id, { status: status as StationStatus });

    // Invalidate cache
    cache.invalidate("stations");
    cache.invalidate(`station_${id}`);
  }
}
