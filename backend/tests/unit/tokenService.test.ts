import { describe, expect, it } from 'vitest';
import { TokenService } from '../../src/utils/token.service';
import { UnauthorizedError } from '../../src/errors/AppError';

const secret = 'unit-test-secret-unit-test-secret-1234';

describe('TokenService', () => {
  it('round-trips a payload', () => {
    const service = new TokenService({ secret, expiresIn: '1h' });
    const token = service.sign({ sub: 'user-1', role: 'ADMIN' });
    expect(service.verify(token)).toMatchObject({ sub: 'user-1', role: 'ADMIN' });
  });

  it('rejects a token signed with another secret', () => {
    const token = new TokenService({ secret: 'another-secret-another-secret-123456', expiresIn: '1h' }).sign({ sub: 'u', role: 'CUSTOMER' });
    expect(() => new TokenService({ secret, expiresIn: '1h' }).verify(token)).toThrow(UnauthorizedError);
  });

  it('rejects an expired token with code TOKEN_EXPIRED', () => {
    const service = new TokenService({ secret, expiresIn: -10 });
    const token = service.sign({ sub: 'u', role: 'CUSTOMER' });
    try {
      service.verify(token);
      expect.unreachable('verify should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect((error as UnauthorizedError).code).toBe('TOKEN_EXPIRED');
    }
  });

  it('rejects garbage and tokens with an unexpected payload shape', () => {
    const service = new TokenService({ secret, expiresIn: '1h' });
    expect(() => service.verify('not-a-jwt')).toThrow(UnauthorizedError);
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
    const odd = jwt.sign({ sub: 'u', role: 'SUPERUSER' }, secret);
    expect(() => service.verify(odd)).toThrow(UnauthorizedError);
  });
});
