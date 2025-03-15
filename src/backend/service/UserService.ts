import "reflect-metadata";

import { User } from "@entities/User";
import { Role } from "@entities/Role";
import { Service } from "typedi";
import { UserStation, UserStationStatus } from "@backend/entities/UserStation";
import { DeepPartial, Repository } from "typeorm";
import AppDataSource from "@backend/config/data-source";
import { BaseService } from "./BaseService";

@Service()
export class UserService extends BaseService{
  private userRepository: Repository<User>;
  private roleRepository: Repository<Role>;
  private userStationRepository: Repository<UserStation>;

    constructor() {
    this.userRepository = this.dataSource.getRepository(User);
    this.roleRepository = this.dataSource.getRepository(Role);
    this.userStationRepository = this.dataSource.getRepository(UserStation);
  }

  public async createUser(
    username: string,
    password: string,
    firstName: string,
    lastName: string,
    role: number,
  ): Promise<User> {

    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error("User already exists");
    } else {

      const newUser: User = this.userRepository.create({
        username,
        password,
        firstName,
        lastName,
      });

      const _role = await this.roleRepository.findOneBy(
        {
          id: role
        }
      );
      if (_role === null) {
        console.log("Role not found. Creating user without role");
      } else {
        newUser.roles = [_role];
      }
      return this.userRepository.save(newUser);
    }
  }

  public async getUsers(role?: string): Promise<User[]> {
    // const query = `select 
    //                 s.id, 
    //                 s.lastName, 
    //                 s.firstName, 
    //                 s.username, 
    //                 s.locked,
    //                 s.last_login_date,
    //                 role_id, r.name as role_name
    //                 from user s
    //                 left join user_roles ur on ur.user_id = s.id
    //                 left join roles r on r.id = ur.role_id`;

    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", 'role')
      .addSelect([
        "user.id",
        "user.lastName",
        "user.firstName",
        "user.username",
        "user.locked",
        "user.last_login_date",
        "role.id",
        "role.name"
      ]);

    if (role) {
      query.andWhere("role.name = :role", { role })
    }

    const users = await query.getMany();
    return users;
  }

  async getUserByUsername(username: string) {
    const userRepository = this.userRepository;
    return await userRepository.findOne({
      where: { username },
      relations: ["roles"],
    });
  }

  async getUserWithRolesAndPermissions(userId: number) {
    const userRepository = this.userRepository;
    const user = await userRepository.findOne({
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

    let permissions = [];
    if (roles.length > 0) {
      permissions = await this.roleRepository
        .createQueryBuilder("permission")
        .innerJoin("role_permissions", "rp", "rp.permission_id = permission.id")
        .where("rp.role_id IN (:...roleIds)", {
          roleIds: roles.map((role) => role.id),
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

  async addUserStation(payload: { station?: any; user: any; }) {
    const userStation: DeepPartial<UserStation> = this.userStationRepository.create({
      user: payload.user,
      station: payload.station,
    });
    return this.userStationRepository.save(userStation);
  }

  async setDefaultStation(userStationRequest: { station: number; user: number; }, currentUser: number) {
    console.log("station update request " + JSON.stringify(userStationRequest));

    return await this.userStationRepository.manager.transaction(async (transactionEntityManager) => {
      const existingStation = await this.userStationRepository.findOne({
        where: {
          user: { id: userStationRequest.user }, station: { id: userStationRequest.station }
        },
      });

      if (!existingStation) {
        throw new Error("User station not found");
      }

      await transactionEntityManager.update(UserStation, { user: { id: userStationRequest.user } }, { isDefault: false });

      existingStation.isDefault = true;
      existingStation.status = UserStationStatus.ENABLED;
      existingStation.updated_by = currentUser;

      await transactionEntityManager.save(UserStation, existingStation);

      return existingStation;
    });
  }

  async disableUserStation(userStationRequest: { userStation: number; }, currentUser: number) {
    const existingStation = await this.userStationRepository.findOne({
      where: {
        id: userStationRequest.userStation
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
}