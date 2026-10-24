import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createErrorHandler } from '../../src/middleware/errorHandler';
import { ConflictError, NotFoundError } from '../../src/errors/AppError';

function handle(error: unknown, nodeEnv: 'production' | 'development' | 'test' = 'test') {
  const json = vi.fn();
  const res = { status: vi.fn().mockReturnThis(), json } as unknown as Response;
  createErrorHandler(nodeEnv, { log: () => undefined })(error, {} as Request, res, vi.fn() as unknown as NextFunction);
  return { status: vi.mocked(res.status).mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

const prismaError = (code: string) => new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: 'test' });

describe('error handler', () => {
  it('renders AppError subclasses with their status and code', () => {
    expect(handle(new NotFoundError('Vehicle not found'))).toEqual({
      status: 404,
      body: { success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } },
    });
    expect(handle(new ConflictError('dup')).status).toBe(409);
  });

  it('renders ZodError as 400 VALIDATION_ERROR with field details', () => {
    const parsed = z.object({ email: z.string().email() }).safeParse({ email: 'nope' });
    const { status, body } = handle(parsed.success ? new Error('x') : parsed.error);
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0]).toMatchObject({ field: 'email' });
  });

  it('maps Prisma P2002 -> 409, P2025 -> 404, P2003 -> 409', () => {
    expect(handle(prismaError('P2002')).status).toBe(409);
    expect(handle(prismaError('P2025')).status).toBe(404);
    expect(handle(prismaError('P2003')).status).toBe(409);
  });

  it('maps malformed JSON bodies to 400 and oversized bodies to 413', () => {
    expect(handle(Object.assign(new SyntaxError('bad'), { type: 'entity.parse.failed', status: 400 })).status).toBe(400);
    expect(handle(Object.assign(new Error('big'), { type: 'entity.too.large', status: 413 })).status).toBe(413);
  });

  it('hides internals of unknown errors in production', () => {
    const { status, body } = handle(new Error('select * from "User" failed at /srv/app.ts'), 'production');
    expect(status).toBe(500);
    expect(body.error.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toMatch(/select|srv|stack/i);
  });

  it('never leaks stack traces, even outside production', () => {
    const { body } = handle(new Error('kaput'), 'development');
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(body.error.message).toBe('kaput');
  });

  it('hides unknown Prisma error details in production', () => {
    const { status, body } = handle(prismaError('P9999'), 'production');
    expect(status).toBe(500);
    expect(body.error.message).toBe('Internal server error');
  });
});
