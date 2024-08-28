import { Injectable } from '@nestjs/common';
import { User } from './user';

@Injectable()
export class UserService {
  private users: User[] = [];

  addUser(name: string, age: number, email: string, password: string): void {
    const newUser = new User(name, age, email, password);
    this.users.push(newUser);
  }

  getUser(email: string): User | undefined {
    for (let i = 0; i < this.users.length; i++) {
      if (this.users[i].email === email) {
        return this.users[i];
      }
    }
    return undefined;
  }

  deleteUser(email: string): void {
    for (let i = 0; i < this.users.length; i++) {
      if (this.users[i].email === email) {
        this.users.splice(i, 1);
        break;
      }
    }
  }
}
