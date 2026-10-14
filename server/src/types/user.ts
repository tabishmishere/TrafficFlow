export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export type PublicUser = Omit<User, "passwordHash">;