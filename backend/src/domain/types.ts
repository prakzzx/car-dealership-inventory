export const ROLES = ['CUSTOMER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

/** What the API is allowed to reveal about a user. Never includes the password hash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}
