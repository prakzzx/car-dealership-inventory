import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app';
import type { AppConfig } from '../../src/config/env';
import { createPrismaClient } from '../../src/db/prisma';
import { TokenService } from '../../src/utils/token.service';
import type { Role } from '../../src/domain/types';
import { assertConnectedToTestDatabase, assertSafeTestDatabaseUrl } from './dbSafety';

export const TEST_PASSWORD = 'Str0ngPassw0rd';

export function buildTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  assertSafeTestDatabaseUrl(databaseUrl, process.env.DATABASE_URL);
  return {
    nodeEnv: 'test',
    port: 0,
    databaseUrl,
    jwtSecret: 'test-secret-test-secret-test-secret-123456',
    jwtExpiresIn: '1h',
    clientUrls: ['http://localhost:5173'],
    bcryptRounds: 4, // minimum cost keeps the suite fast; production uses BCRYPT_ROUNDS
    authRateLimitMax: 1000,
    authRateLimitWindowMs: 15 * 60 * 1000,
    logRequests: false,
    ...overrides,
  };
}

export function createTestContext(overrides: Partial<AppConfig> = {}) {
  const config = buildTestConfig(overrides);
  const prisma: PrismaClient = createPrismaClient(config.databaseUrl);
  const app = createApp({ config, prisma });
  const tokens = new TokenService({ secret: config.jwtSecret, expiresIn: config.jwtExpiresIn });

  async function resetDatabase(): Promise<void> {
    const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    assertConnectedToTestDatabase(rows[0]?.db ?? '');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Purchase", "Vehicle", "User" RESTART IDENTITY CASCADE');
  }

  async function createUser(opts: { role?: Role; email?: string; name?: string; password?: string } = {}) {
    const password = opts.password ?? TEST_PASSWORD;
    const user = await prisma.user.create({
      data: {
        name: opts.name ?? 'Test User',
        email: (opts.email ?? `user-${Math.random().toString(36).slice(2)}@example.com`).toLowerCase(),
        passwordHash: await bcrypt.hash(password, 4),
        role: opts.role ?? 'CUSTOMER',
      },
    });
    const token = tokens.sign({ sub: user.id, role: user.role });
    return { user, password, token, auth: `Bearer ${token}` };
  }

  return { app, prisma, config, tokens, resetDatabase, createUser, close: () => prisma.$disconnect() };
}

export type TestContext = ReturnType<typeof createTestContext>;
