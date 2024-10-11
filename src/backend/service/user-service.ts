import "reflect-metadata";

import { User } from "@entities/User";
import { AppDataSource } from "../config/data-source";

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
    return this.userRepository.find();
  }

  async getUserByUsername(username: string): Promise<User> {
    console.log("Getting user by username:", username);
    const user = await this.userRepository.findOneBy({ username: username });
    console.log("User fetched :", user);
    if (!user) {
      return;
    }
    return user;
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: id });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
}
