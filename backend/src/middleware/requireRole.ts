import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import type { Role } from '../domain/types';

/**
 * Authorization gate. Must run AFTER `authenticate`. The decision is made on the server from the signed
 * token, so hiding buttons in the UI is a convenience only - never the actual protection.
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (!allowed.includes(req.user.role)) return next(new ForbiddenError());
    return next();
  };
}
