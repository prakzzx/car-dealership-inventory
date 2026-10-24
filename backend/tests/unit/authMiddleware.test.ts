import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createAuthenticate } from '../../src/middleware/authenticate';
import { requireRole } from '../../src/middleware/requireRole';
import { ForbiddenError, UnauthorizedError } from '../../src/errors/AppError';
import { TokenService } from '../../src/utils/token.service';

const secret = 'middleware-secret-middleware-secret-12';
const tokens = new TokenService({ secret, expiresIn: '1h' });

function run(headers: Record<string, string> = {}, authenticate = createAuthenticate(tokens)) {
  const req = { headers } as unknown as Request;
  const next = vi.fn() as unknown as NextFunction;
  authenticate(req, {} as Response, next);
  return { req, next: next as unknown as ReturnType<typeof vi.fn> };
}

describe('authenticate middleware', () => {
  it('rejects a missing Authorization header', () => {
    const { next } = run();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a header that is not a Bearer token', () => {
    const { next } = run({ authorization: 'Basic abc' });
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects an invalid token', () => {
    const { next } = run({ authorization: 'Bearer garbage' });
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects an expired token with code TOKEN_EXPIRED', () => {
    const expired = new TokenService({ secret, expiresIn: -5 }).sign({ sub: 'u1', role: 'CUSTOMER' });
    const { next } = run({ authorization: `Bearer ${expired}` });
    expect((next.mock.calls[0]?.[0] as UnauthorizedError).code).toBe('TOKEN_EXPIRED');
  });

  it('attaches req.user and calls next() with no error for a valid token', () => {
    const token = tokens.sign({ sub: 'u1', role: 'ADMIN' });
    const { req, next } = run({ authorization: `Bearer ${token}` });
    expect(req.user).toEqual({ id: 'u1', role: 'ADMIN' });
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireRole middleware', () => {
  const call = (user: Request['user']) => {
    const next = vi.fn();
    requireRole('ADMIN')({ user } as Request, {} as Response, next as unknown as NextFunction);
    return next;
  };

  it('401 when there is no authenticated user', () => {
    expect(call(undefined).mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  it('403 when the role is not allowed', () => {
    expect(call({ id: 'u', role: 'CUSTOMER' }).mock.calls[0]?.[0]).toBeInstanceOf(ForbiddenError);
  });

  it('passes when the role is allowed', () => {
    expect(call({ id: 'u', role: 'ADMIN' })).toHaveBeenCalledWith();
  });
});
