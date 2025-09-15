import "reflect-metadata";

import { User } from "@entities/User";
import { Role } from "@entities/Role";
import { UserStation, UserStationStatus } from "@backend/entities/UserStation";
import { DataSource, DeepPartial, Repository } from "typeorm";
import { Permission } from "@backend/entities/Permission";

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

        if (_role === null) {
        } else {
          newUser.roles = [_role];
        }

        return await transactionManager.save(User, newUser);
      },
    );
  }

  public async getUsers(role?: string, page = 1, pageSize = 10): Promise<{ users: User[]; total: number }> {
    // Get total count first
    const totalQuery = this.userRepository
      .createQueryBuilder("user")
      .leftJoin("user.roles", "roles");

    if (role) {
      totalQuery.andWhere("roles.name = :role", { role });
    }

    const total = await totalQuery.getCount();

    // Get users with relations
    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "roles");

    if (role) {
      query.andWhere("roles.name = :role", { role });
    }

    query.skip((page - 1) * pageSize).take(pageSize);
    const users = await query.getMany();

    return { users, total };
  }

  async getUserByUsername(username: string) {
    return await this.userRepository.findOne({
      where: { username },
      relations: ["roles"],
    });
  }

  async getUserWithRolesAndPermissions(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["roles"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const roles = await this.roleRepository
      .createQueryBuilder("role")
      .innerJoin("user_roles", "ur", "ur.role_id = role.id")
      .where("ur.user_id = :userId", { userId })
      .getMany();

    let permissions: Permission[] = [];
    if (roles.length > 0) {
      permissions = await this.permissionRepository
        .createQueryBuilder("permission")
        .innerJoin("role_permissions", "rp", "rp.permission_id = permission.id")
        .where("rp.role_id IN (:...roleIds)", {
          roleIds: roles.map((role: { id: any }) => role.id),
        })
        .getMany();
    }

    return { ...user, roles, permissions };
  }

  async getUserWithRolesAndStations(userId: number) {
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
    return {
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
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ["roles"],
    });

    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async fetchUserStations(userId: number) {
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

    // Transform the flat results into the expected structure
    const stations = results.map(row => ({
      id: row.id,
      user_id: row.user_id,
      station_id: row.station_id,
      isDefault: row.is_default === 1,
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

    return { stations };
  }

  async addUserStation(payload: { station?: any; user: any }) {
    // Validate user role before allowing station assignment
    const user = await this.userRepository.findOne({
      where: { id: payload.user },
      relations: ["roles"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const userRole = user.roles && user.roles.length > 0 ? user.roles[0].name : null;
    const allowedRoles = ['sales', 'supervisor', 'admin'];

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new Error(`Only users with ${allowedRoles.join(', ')} roles can be assigned stations. Current role: ${userRole || 'none'}`);
    }

    const userStation: DeepPartial<UserStation> =
      this.userStationRepository.create({
        user: payload.user,
        station: payload.station,
      });
    return await this.userStationRepository.save(userStation);
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

        return existingStation;
      },
    );
  }

  async disableUserStation(
    userStationRequest: { userStation: number; action?: string },
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

    // Handle both activate and deactivate actions
    if (userStationRequest.action === "activate") {
      existingStation.status = UserStationStatus.ACTIVE;
    } else {
      existingStation.status = UserStationStatus.INACTIVE;
      existingStation.isDefault = false; // Remove default status when deactivating
    }

    existingStation.updated_by = currentUser;

    return await this.userStationRepository.save(existingStation);
  }

  async softDeleteUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.status = "DELETED";
    await this.userRepository.save(user);
    return user;
  }

  async reactivateUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.status = "ACTIVE";
    await this.userRepository.save(user);
    return user;
  }

  async updateUser(userId: number, updates: { firstName?: string; lastName?: string; username?: string }, updatedBy?: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (updates.firstName !== undefined) user.firstName = updates.firstName;
    if (updates.lastName !== undefined) user.lastName = updates.lastName;
    if (updates.username !== undefined) user.username = updates.username;
    if (updatedBy !== undefined) user.updated_by = updatedBy;
    return await this.userRepository.save(user);
  }

  async lockUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.is_locked = true;
    return await this.userRepository.save(user);
  }

  async unlockUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.is_locked = false;
    return await this.userRepository.save(user);
  }
}
