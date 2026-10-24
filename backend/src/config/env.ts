import { z } from 'zod';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  clientUrls: string[];
  bcryptRounds: number;
  authRateLimitMax: number;
  authRateLimitWindowMs: number;
  logRequests: boolean;
}

const DEV_PLACEHOLDER_PREFIX = 'dev-only';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    // Examples: 15m, 1h, 7d. A bare number would be read as milliseconds by jsonwebtoken, so we forbid it.
    JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like 15m, 1h or 7d').default('1h'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  })
  .superRefine((env, ctx) => {
    // A copied .env.example secret in production would let anyone mint admin tokens.
    if (env.NODE_ENV === 'production' && env.JWT_SECRET.startsWith(DEV_PLACEHOLDER_PREFIX)) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET must not be the development placeholder in production' });
    }
  });

/** Parses and validates environment variables once, failing fast with a readable message. */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration -> ${problems}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET,
    jwtExpiresIn: e.JWT_EXPIRES_IN,
    clientUrls: e.CLIENT_URL.split(',').map((u) => u.trim()).filter(Boolean),
    bcryptRounds: e.BCRYPT_ROUNDS,
    authRateLimitMax: e.AUTH_RATE_LIMIT_MAX,
    authRateLimitWindowMs: 15 * 60 * 1000,
    logRequests: e.NODE_ENV !== 'test',
  };
}
