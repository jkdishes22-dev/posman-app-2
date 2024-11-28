import "reflect-metadata";

import { User } from "@entities/User";
import { AppDataSource } from "../config/data-source";
import { Role } from "@entities/Role";
import { Permission } from "@entities/Permission";
import { Service } from "typedi";

@Service()
export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  public async createUser(
    username: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<User> {
    const newUser: User = this.userRepository.create({
      username,
      password,
      firstName,
      lastName,
    });
    return this.userRepository.save(newUser);
  }

  public async getUsers(): Promise<User[]> {
    const query = `select 
                    s.id, s.lastName, s.firstName, role_id, r.name
                    from user s
                    left join user_roles ur on ur.user_id = s.id
                    left join roles r on r.id = ur.role_id`

    return await AppDataSource.query(query);
    // return this.userRepository.find();
  }

  async getUserByUsername(username: string) {
    const userRepository = AppDataSource.getRepository(User);
    return await userRepository.findOne({
      where: { username },
      relations: ["roles"],
    });
  }

  async getUserWithRolesAndPermissions(userId: number) {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ["roles"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const roles = await AppDataSource.getRepository(Role)
      .createQueryBuilder("role")
      .innerJoin("user_roles", "ur", "ur.role_id = role.id")
      .where("ur.user_id = :userId", { userId })
      .getMany();

    let permissions = [];
    if (roles.length > 0) {
      permissions = await AppDataSource.getRepository(Permission)
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
    const user = await this.userRepository.findOneBy({ id: id });
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
    return await AppDataSource.query(query, [userId]);
  }
}
