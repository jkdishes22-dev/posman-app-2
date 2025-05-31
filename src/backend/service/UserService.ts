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
        });

        const _role = await transactionManager.findOne(Role, {
          where: { id: role },
        });

        if (_role === null) {
          console.log("Role not found. Creating user without role");
        } else {
          newUser.roles = [_role];
        }

        return await transactionManager.save(User, newUser);
      },
    );
  }

  public async getUsers(role?: string, page = 1, pageSize = 10): Promise<{ users: User[]; total: number }> {
    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role");

    if (role) {
      query.andWhere("role.name = :role", { role });
    }

    const total = await query.getCount();
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
      select us.*, s.name from user u
      left join user_station us on u.id = us.user_id
      left join station s on s.id = us.station_id
      WHERE u.id = ?
  `;
    return await this.userStationRepository.query(query, [userId]);
  }

  async addUserStation(payload: { station?: any; user: any }) {
    const userStation: DeepPartial<UserStation> =
      this.userStationRepository.create({
        user: payload.user,
        station: payload.station,
      });
    return this.userStationRepository.save(userStation);
  }

  async setDefaultStation(
    userStationRequest: { station: number; user: number },
    currentUser: number,
  ) {
    console.log("station update request " + JSON.stringify(userStationRequest));

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
        existingStation.status = UserStationStatus.ENABLED;
        existingStation.updated_by = currentUser;

        await transactionEntityManager.save(UserStation, existingStation);

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

    existingStation.status = UserStationStatus.DISABLED;
    existingStation.updated_by = currentUser;
    existingStation.isDefault = false;

    return await this.userStationRepository.save(existingStation);
  }

  async softDeleteUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    user.status = 'DELETED';
    await this.userRepository.save(user);
    return user;
  }

  async reactivateUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    user.status = 'ACTIVE';
    await this.userRepository.save(user);
    return user;
  }

  async updateUser(userId: number, updates: { firstName?: string; lastName?: string; username?: string }) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (updates.firstName !== undefined) user.firstName = updates.firstName;
    if (updates.lastName !== undefined) user.lastName = updates.lastName;
    if (updates.username !== undefined) user.username = updates.username;
    return await this.userRepository.save(user);
  }

  async lockUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    user.is_locked = true;
    return await this.userRepository.save(user);
  }

  async unlockUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    user.is_locked = false;
    return await this.userRepository.save(user);
  }
}
