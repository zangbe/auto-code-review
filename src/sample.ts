class Rectangle {
  width: number;
  height: number;
  color: string;

  constructor(w: number, h: number, c: string) {
    this.width = w;
    this.height = h;
    this.color = c;
  }

  calculate_area() {
    return this.width * this.height;
  }

  printRectangleDetails() {
    console.log(
      `Rectangle: ${this.width}x${this.height}, Color: ${this.color}`,
    );
  }
}

class Circle {
  radius: number;
  color: string;

  constructor(radius: number, color: string) {
    this.radius = radius;
    this.color = color;
  }

  calculate_area() {
    return Math.PI * Math.pow(this.radius, 2);
  }

  printCircleDetails() {
    console.log(`Circle: Radius ${this.radius}, Color: ${this.color}`);
  }
}

class ShapePrinter {
  printShapeDetails(shape: any) {
    if (shape instanceof Rectangle) {
      shape.printRectangleDetails();
    } else if (shape instanceof Circle) {
      shape.printCircleDetails();
    } else {
      console.log('Unknown shape!');
    }
  }
}

class User {
  name: string;
  age: number;
  email: string;
  password: string;

  constructor(name: string, age: number, email: string, password: string) {
    this.name = name;
    this.age = age;
    this.email = email;
    this.password = password;
  }

  greet() {
    console.log(`Hello, my name is ${this.name}.`);
  }

  // This method checks if the user is an admin
  isAdmin() {
    return this.email === 'admin@example.com' && this.password === 'admin123';
  }
}

class UserService {
  private users: User[] = [];

  addUser(user: User) {
    this.users.push(user);
  }

  removeUser(user: User) {
    const index = this.users.indexOf(user);
    if (index > -1) {
      this.users.splice(index, 1);
    }
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.find((user) => user.email === email);
  }

  listAllUsers() {
    console.log('User List:');
    this.users.forEach((user) => {
      console.log(`Name: ${user.name}, Age: ${user.age}, Email: ${user.email}`);
    });
  }
}

// Example usage:
const rectangle = new Rectangle(10, 20, 'blue');
const circle = new Circle(5, 'red');
const shapePrinter = new ShapePrinter();

shapePrinter.printShapeDetails(rectangle);
shapePrinter.printShapeDetails(circle);

const userService = new UserService();
userService.addUser(
  new User('John Doe', 30, 'john.doe@example.com', 'password123'),
);
userService.addUser(new User('Admin', 40, 'admin@example.com', 'admin123'));

const user = userService.findUserByEmail('john.doe@example.com');
if (user) {
  user.greet();
}

if (user && user.isAdmin()) {
  console.log('Admin user detected.');
}

userService.listAllUsers();
