import { Router, type RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import type { AuthController } from './auth.controller';

export function createAuthRouter(controller: AuthController, authenticate: RequestHandler, credentialsLimiter: RequestHandler): Router {
  const router = Router();
  // Brute-force protection only on endpoints that accept credentials.
  router.post('/register', credentialsLimiter, asyncHandler(controller.register));
  router.post('/login', credentialsLimiter, asyncHandler(controller.login));
  router.get('/me', authenticate, asyncHandler(controller.me));
  return router;
}
