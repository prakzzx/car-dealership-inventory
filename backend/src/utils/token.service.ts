import jwt, { type SignOptions } from 'jsonwebtoken';
import { isRole, type AuthTokenPayload } from '../domain/types';
import { UnauthorizedError } from '../errors/AppError';

export interface TokenServiceOptions {
  secret: string;
  expiresIn: string | number;
}

/** Thin wrapper over jsonwebtoken so the algorithm and payload shape are pinned in exactly one place. */
export class TokenService {
  constructor(private readonly options: TokenServiceOptions) {}

  sign(payload: AuthTokenPayload): string {
    return jwt.sign({ role: payload.role }, this.options.secret, {
      subject: payload.sub,
      algorithm: 'HS256',
      expiresIn: this.options.expiresIn as SignOptions['expiresIn'],
    });
  }

  verify(token: string): AuthTokenPayload {
    let decoded: string | jwt.JwtPayload;
    try {
      // Pinning the algorithm prevents "alg: none" / algorithm-confusion tricks.
      decoded = jwt.verify(token, this.options.secret, { algorithms: ['HS256'] });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) throw new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
      throw new UnauthorizedError('Invalid token', 'INVALID_TOKEN');
    }
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || !isRole(decoded.role)) {
      throw new UnauthorizedError('Invalid token', 'INVALID_TOKEN');
    }
    return { sub: decoded.sub, role: decoded.role };
  }
}
