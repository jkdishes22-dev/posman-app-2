import "reflect-metadata";

import { User } from "@entities/User";
import { Role } from "@entities/Role";
import { UserStation, UserStationStatus } from "@backend/entities/UserStation";
import { DataSource, DeepPartial, Repository } from "typeorm";
import { Permission } from "@backend/entities/Permission";
import { cache } from "@backend/utils/cache";

export class UserService {
  private userRepository: Repository<User>;
  private roleRepository: Repository<Role>;
  private permissionRepository: Repository<Permission>;
  private userStationRepository: Repository<UserStation>;

  constructor(dataSource: DataSource) {
    this.userRepository = dataSource.getRepository(User);
    this.roleRepository = dataSource.getRepository(Role);
    this.userStationRepository = dataSource.getRepository(UserStation);
    this.permissionRepository = dataSource.getRepository(Permission);
  }

  public async createUser(
    username: string,
    password: string,
    firstName: string,
    lastName: string,
    role: number,
    createdBy?: number,
  ): Promise<User> {
    return await this.userRepository.manager.transaction(
      async (transactionManager) => {
        const existingUser = await transactionManager.findOne(User, {
          where: { username },
        });

        if (existingUser) {
          throw new Error("User already exists");
        }

        const newUser = transactionManager.create(User, {
          username,
          password,
          firstName,
          lastName,
          created_by: createdBy,
          updated_by: createdBy,
        });

        const _role = await transactionManager.findOne(Role, {
          where: { id: role },
        });

        if (_role !== null) {
          newUser.roles = [_role];
        }

        const saved = await transactionManager.save(User, newUser);

        // Invalidate cache after creating user
        cache.invalidate("users");

        return saved;
      },
    );
  }

  public async getUsers(role?: string, page = 1, pageSize = 10, search?: string): Promise<{ users: User[]; total: number }> {
    // Only cache if no search (search results change frequently)
    const cacheKey = search
      ? null
      : `users_${role || "all"}_${page}_${pageSize}`;

    // Try cache first (only for non-search queries)
    if (cacheKey) {
      const cached = cache.get<{ users: User[]; total: number }>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Optimized query: select only needed fields and use efficient joins
    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role")
      .select([
        "user.id",
        "user.username",
        "user.firstName",
        "user.lastName",
        "user.status",
        "user.created_at",
        "user.updated_at",
        "role.id",
        "role.name"
      ]);

    if (role) {
      query.andWhere("role.name = :role", { role });
    }

    if (search) {
      query.andWhere(
        "(user.firstName LIKE :search OR user.lastName LIKE :search OR user.username LIKE :search)",
        { search: `%${search}%` }
      );
    }

    // Get total count (optimized - no need to load relations for count)
    const countQuery = this.userRepository
      .createQueryBuilder("user")
      .leftJoin("user.roles", "role");

    if (role) {
      countQuery.andWhere("role.name = :role", { role });
    }

    if (search) {
      countQuery.andWhere(
        "(user.firstName LIKE :search OR user.lastName LIKE :search OR user.username LIKE :search)",
        { search: `%${search}%` }
      );
    }

    const total = await countQuery.getCount();

    // Get paginated users
    query.skip((page - 1) * pageSize).take(pageSize);
    const users = await query.getMany();

    const result = { users, total };

    // Cache the result (only for non-search queries)
    if (cacheKey) {
      cache.set(cacheKey, result);
    }

    return result;
  }

  async getUserByUsername(username: string, includePassword: boolean = false) {
    const cacheKey = `user_username_${username}`;

    // For login, we need password, so don't use cache
    // For other uses, try cache first
    if (!includePassword) {
      const cached = cache.get<User | null>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Optimized query: select only needed fields
    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role")
      .where("user.username = :username", { username })
      .select([
        "user.id",
        "user.username",
        "user.firstName",
        "user.lastName",
        "user.status",
        "user.created_at",
        "user.updated_at",
        "user.refreshToken",
        "role.id",
        "role.name"
      ]);

    // Only include password if explicitly requested (for login)
    if (includePassword) {
      query.addSelect("user.password");
    }

    const result = await query.getOne();

    // Cache the result (but exclude password from cache for security)
    if (result && !includePassword) {
      const { password, ...userWithoutPassword } = result;
      cache.set(cacheKey, userWithoutPassword as User);
    } else if (!result && !includePassword) {
      cache.set(cacheKey, null);
    }

    return result;
  }

  async getUserWithRolesAndPermissions(userId: number) {
    const cacheKey = `user_roles_permissions_${userId}`;

    // Try cache first
    const cached = cache.get<{ user: User; roles: Role[]; permissions: Permission[] }>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Optimized: Single query to get user, roles, and permissions
    const query = `
      SELECT 
        u.id as user_id,
        u.username,
        u.firstName,
        u.lastName,
        u.status as user_status,
        r.id as role_id,
        r.name as role_name,
        p.id as permission_id,
        p.name as permission_name
      FROM user u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ?
    `;

    const results = await this.userRepository.manager.query(query, [userId]);

    if (results.length === 0) {
      throw new Error("User not found");
    }

    // Process results into structured format
    const firstRow = results[0];
    const user: Partial<User> = {
      id: firstRow.user_id,
      username: firstRow.username,
      firstName: firstRow.firstName,
      lastName: firstRow.lastName,
      status: firstRow.user_status,
    };

    // Extract unique roles and permissions
    const rolesMap = new Map<number, Role>();
    const permissionsMap = new Map<number, Permission>();

    results.forEach((row: any) => {
      if (row.role_id && !rolesMap.has(row.role_id)) {
        rolesMap.set(row.role_id, {
          id: row.role_id,
          name: row.role_name,
        } as Role);
      }
      if (row.permission_id && !permissionsMap.has(row.permission_id)) {
        permissionsMap.set(row.permission_id, {
          id: row.permission_id,
          name: row.permission_name,
        } as Permission);
      }
    });

    const roles = Array.from(rolesMap.values());
    const permissions = Array.from(permissionsMap.values());

    const result = { ...user, roles, permissions } as any;

    // Cache the result (exclude password)
    cache.set(cacheKey, result);

    return result;
  }

  async getUserWithRolesAndStations(userId: number) {
    const cacheKey = `user_roles_stations_${userId}`;

    // Try cache first
    const cached = cache.get<any>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["roles"],
    });
    if (!user) throw new Error("User not found");

    // Get stations for the user
    const stations = await this.userStationRepository.find({
      where: { user: { id: userId } },
      relations: ["station"],
    });

    // Get default pricelists for each station using junction table
    const stationIds = stations.map(us => us.station.id);
    let defaultPricelists = [];

    if (stationIds.length > 0) {
      const stationPricelistRepository = this.userRepository.manager.getRepository("StationPricelist");
      defaultPricelists = await stationPricelistRepository
        .createQueryBuilder("sp")
        .leftJoinAndSelect("sp.pricelist", "pricelist")
        .leftJoinAndSelect("sp.station", "station")
        .where("station.id IN (:...stationIds)", { stationIds })
        .andWhere("sp.is_default = :isDefault", { isDefault: true })
        .andWhere("sp.status = :status", { status: "active" })
        .select(["pricelist.id", "pricelist.name", "station.id"])
        .getMany();
    }

    // Create a map of station ID to default pricelist
    const pricelistMap = new Map();
    defaultPricelists.forEach(sp => {
      pricelistMap.set(sp.station.id, {
        id: sp.pricelist.id,
        name: sp.pricelist.name
      });
    });

    // Return user, roles, and stations (with station details and default pricelist)
    const result = {
      ...user,
      roles: user.roles,
      stations: stations.map((us) => ({
        id: us.station.id,
        name: us.station.name,
        isDefault: us.isDefault,
        status: us.status,
        defaultPricelist: pricelistMap.get(us.station.id) || null
      })),
    };

    // Cache the result (exclude password)
    const { password, ...userWithoutPassword } = user;
    cache.set(cacheKey, { ...result, ...userWithoutPassword } as any);

    return result;
  }

  async getUserById(id: number): Promise<User> {
    const cacheKey = `user_${id}`;

    // Try cache first
    const cached = cache.get<User | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ["roles"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Cache the result (exclude password)
    const { password, ...userWithoutPassword } = user;
    cache.set(cacheKey, userWithoutPassword as User);

    return user;
  }

  async fetchUserStations(userId: number) {
    const cacheKey = `user_stations_${userId}`;

    // Try cache first
    const cached = cache.get<any[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const query = `
      SELECT 
        us.id,
        us.user_id,
        us.station_id,
        us.is_default,
        us.status,
        us.updated_at,
        us.created_at,
        us.created_by,
        us.updated_by,
        s.id as station_id,
        s.name as station_name,
        s.status as station_status
      FROM user u
      LEFT JOIN user_station us ON u.id = us.user_id
      LEFT JOIN station s ON s.id = us.station_id
      WHERE u.id = ? AND us.id IS NOT NULL
      ORDER BY us.is_default DESC, s.name ASC
    `;
    const results = await this.userStationRepository.query(query, [userId]);

    // Transform the flattened results into the expected nested structure
    const result = results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      station_id: row.station_id,
      isDefault: row.is_default,
      status: row.status,
      updated_at: row.updated_at,
      created_at: row.created_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
      station: {
        id: row.station_id,
        name: row.station_name,
        status: row.station_status
      }
    }));

    // Cache the result
    cache.set(cacheKey, result);
    return result;
  }

  async addUserStation(payload: { station?: any; user: any }) {
    const userStation: DeepPartial<UserStation> =
      this.userStationRepository.create({
        user: payload.user,
        station: payload.station,
      });
    const saved = await this.userStationRepository.save(userStation);

    // Invalidate cache
    cache.invalidate(`user_stations_${payload.user.id || payload.user}`);
    cache.invalidate(`user_roles_stations_${payload.user.id || payload.user}`);
    cache.invalidate("user_stations");

    return saved;
  }

  async setDefaultStation(
    userStationRequest: { station: number; user: number },
    currentUser: number,
  ) {

    return await this.userStationRepository.manager.transaction(
      async (transactionEntityManager: {
        update: (
          arg0: typeof UserStation,
          arg1: { user: { id: number } },
          arg2: { isDefault: boolean },
        ) => any;
        save: (arg0: typeof UserStation, arg1: any) => any;
      }) => {
        const existingStation = await this.userStationRepository.findOne({
          where: {
            user: { id: userStationRequest.user },
            station: { id: userStationRequest.station },
          },
        });

        if (!existingStation) {
          throw new Error("User station not found");
        }

        await transactionEntityManager.update(
          UserStation,
          { user: { id: userStationRequest.user } },
          { isDefault: false },
        );

        existingStation.isDefault = true;
        existingStation.status = UserStationStatus.ACTIVE;
        existingStation.updated_by = currentUser;

        await transactionEntityManager.save(UserStation, existingStation);

        // Invalidate cache
        cache.invalidate(`user_stations_${userStationRequest.user}`);
        cache.invalidate(`user_roles_stations_${userStationRequest.user}`);
        cache.invalidate("user_stations");
        cache.invalidate(`user_default_station_${userStationRequest.user}`);

        return existingStation;
      },
    );
  }

  async disableUserStation(
    userStationRequest: { userStation: number },
    currentUser: number,
  ) {
    const existingStation = await this.userStationRepository.findOne({
      where: {
        id: userStationRequest.userStation,
      },
    });

    if (!existingStation) {
      throw new Error("User station not found");
    }

    existingStation.status = UserStationStatus.INACTIVE;
    existingStation.updated_by = currentUser;
    existingStation.isDefault = false;

    const saved = await this.userStationRepository.save(existingStation);

    // Invalidate cache
    cache.invalidate(`user_stations_${existingStation.user.id}`);
    cache.invalidate(`user_roles_stations_${existingStation.user.id}`);
    cache.invalidate("user_stations");

    return saved;
  }

  async softDeleteUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.status = "DELETED";
    await this.userRepository.save(user);

    // Invalidate cache
    cache.invalidate("users");
    cache.invalidate(`user_${userId}`);
    cache.invalidate(`user_username_${user.username}`);
    cache.invalidate(`user_roles_permissions_${userId}`);
    cache.invalidate(`user_roles_stations_${userId}`);
    cache.invalidate(`user_stations_${userId}`);

    return user;
  }

  async reactivateUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.status = "ACTIVE";
    await this.userRepository.save(user);

    // Invalidate cache
    cache.invalidate("users");
    cache.invalidate(`user_${userId}`);
    cache.invalidate(`user_username_${user.username}`);
    cache.invalidate(`user_roles_permissions_${userId}`);
    cache.invalidate(`user_roles_stations_${userId}`);

    return user;
  }

  async updateUser(userId: number, updates: { firstName?: string; lastName?: string; username?: string }, updatedBy?: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    const oldUsername = user.username;
    if (updates.firstName !== undefined) user.firstName = updates.firstName;
    if (updates.lastName !== undefined) user.lastName = updates.lastName;
    if (updates.username !== undefined) user.username = updates.username;
    if (updatedBy !== undefined) user.updated_by = updatedBy;
    const saved = await this.userRepository.save(user);

    // Invalidate cache
    cache.invalidate("users");
    cache.invalidate(`user_${userId}`);
    cache.invalidate(`user_username_${oldUsername}`);
    if (updates.username && updates.username !== oldUsername) {
      cache.invalidate(`user_username_${updates.username}`);
    }
    cache.invalidate(`user_roles_permissions_${userId}`);
    cache.invalidate(`user_roles_stations_${userId}`);

    return saved;
  }

  async lockUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.is_locked = true;
    const saved = await this.userRepository.save(user);

    // Invalidate cache
    cache.invalidate("users");
    cache.invalidate(`user_${userId}`);
    cache.invalidate(`user_username_${user.username}`);

    return saved;
  }

  async unlockUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.is_locked = false;
    const saved = await this.userRepository.save(user);

    // Invalidate cache
    cache.invalidate("users");
    cache.invalidate(`user_${userId}`);
    cache.invalidate(`user_username_${user.username}`);

    return saved;
  }
}
