export class User {
  public name: string;
  public age: number;
  public email: string;
  public password: string;

  constructor(name: string, age: number, email: string, password: string) {
    this.name = name;
    this.age = age;
    this.email = email;
    this.password = password;
  }

  // This function checks if the user is an adult
  isAdult(): boolean {
    return this.age >= 18;
  }

  // This function returns a welcome message
  getWelcomeMessage() {
    return `Welcome ${this.name}!`;
  }
}
