import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from './config/env';
import { AppError } from './errors/AppError';
import { createAuthenticate } from './middleware/authenticate';
import { createErrorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { AuthController } from './modules/auth/auth.controller';
import { createAuthRouter } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import { PrismaUserRepository } from './modules/auth/user.repository';
import { InventoryController } from './modules/inventory/inventory.controller';
import { PrismaInventoryRepository } from './modules/inventory/inventory.repository';
import { registerInventoryRoutes } from './modules/inventory/inventory.routes';
import { InventoryService } from './modules/inventory/inventory.service';
import { VehicleController } from './modules/vehicles/vehicle.controller';
import { PrismaVehicleRepository } from './modules/vehicles/vehicle.repository';
import { createVehicleRouter } from './modules/vehicles/vehicle.routes';
import { VehicleService } from './modules/vehicles/vehicle.service';
import { asyncHandler } from './utils/asyncHandler';
import { BcryptPasswordHasher } from './utils/password.hasher';
import { sendSuccess } from './utils/response';
import { TokenService } from './utils/token.service';

export interface AppDependencies {
  config: AppConfig;
  prisma: PrismaClient;
}

/**
 * Composition root: the only place that knows which concrete classes implement which interface.
 * Everything below receives its collaborators through constructors (dependency injection).
 */
export function createApp({ config, prisma }: AppDependencies): Express {
  const tokenService = new TokenService({ secret: config.jwtSecret, expiresIn: config.jwtExpiresIn });
  const authenticate = createAuthenticate(tokenService);

  const authService = new AuthService({
    userRepository: new PrismaUserRepository(prisma),
    passwordHasher: new BcryptPasswordHasher(config.bcryptRounds),
    tokenService,
  });
  const authController = new AuthController(authService);

  const vehicleRepository = new PrismaVehicleRepository(prisma);
  const vehicleController = new VehicleController(new VehicleService(vehicleRepository));
  const inventoryController = new InventoryController(new InventoryService(new PrismaInventoryRepository(prisma)));

  const credentialsLimiter = rateLimit({
    windowMs: config.authRateLimitWindowMs,
    limit: config.authRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many attempts. Please try again later.')),
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.clientUrls }));
  if (config.logRequests) app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
  // Small limit on purpose: nothing in this API needs large payloads (images are URLs, not uploads).
  app.use(express.json({ limit: '100kb' }));

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database unavailable');
      }
      sendSuccess(res, { status: 'ok', database: 'up', uptimeSeconds: Math.round(process.uptime()) });
    }),
  );

  app.use('/api/auth', createAuthRouter(authController, authenticate, credentialsLimiter));
  app.use('/api/vehicles', createVehicleRouter(vehicleController, authenticate, (router) => registerInventoryRoutes(router, inventoryController)));

  app.use(notFoundHandler);
  app.use(createErrorHandler(config.nodeEnv));
  return app;
}
