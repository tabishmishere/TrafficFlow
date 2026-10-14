import { randomUUID } from "node:crypto";
import type { User } from "../types/user";

const users: User[] = [];

export function findUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email === email);
}

export function createUser(name: string, email: string, passwordHash: string): User {
  const user: User = { id: randomUUID(), name, email, passwordHash };
  users.push(user);
  return user;
}