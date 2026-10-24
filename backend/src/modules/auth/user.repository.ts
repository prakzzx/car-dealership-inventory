import type { PrismaClient } from '@prisma/client';
import type { Role, User } from '../../domain/types';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

/** Persistence port used by AuthService. Swapping the DB (or mocking it in tests) never touches business logic. */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
