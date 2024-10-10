import 'reflect-metadata';

import { User } from '@entities/User';
import { AppDataSource } from '../lib/data-source';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  public async createUser(username: string, password: string, firstName: string, lastName:string): Promise<User> {
    const newUser:User = this.userRepository.create({ username, password, firstName, lastName });
    console.log('newUser:', newUser);
    return this.userRepository.save(newUser);
  }

  public async getUsers(): Promise<User[]> {
    return this.userRepository.find();
  }
}
