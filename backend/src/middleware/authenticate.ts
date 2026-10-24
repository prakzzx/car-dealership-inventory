import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import type { TokenService } from '../utils/token.service';

/** Verifies the Bearer JWT and exposes { id, role } on req.user. Does NOT hit the database (stateless). */
export function createAuthenticate(tokenService: TokenService): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header) return next(new UnauthorizedError('Authentication required'));

    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return next(new UnauthorizedError('Authorization header must be "Bearer <token>"', 'INVALID_TOKEN'));
    }

    try {
      const payload = tokenService.verify(token);
      req.user = { id: payload.sub, role: payload.role };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
