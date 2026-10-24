import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

interface Logger {
  log: (...args: unknown[]) => void;
}

interface ErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

const GENERIC_MESSAGE = 'Internal server error';

function bodyParserErrorType(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'type' in error && typeof (error as { type: unknown }).type === 'string') {
    return (error as { type: string }).type;
  }
  return undefined;
}

/**
 * Single place that decides what the client sees. Rule of thumb: expected failures get a precise message,
 * unexpected ones get a generic 500 in production so SQL, file paths and stack traces never leak.
 */
export function createErrorHandler(nodeEnv: string, logger: Logger = { log: console.error }): ErrorRequestHandler {
  const isProduction = nodeEnv === 'production';

  return (error, _req, res, _next) => {
    const send = (status: number, code: string, message: string, details?: unknown) => {
      const body: ErrorBody = { success: false, error: { code, message } };
      if (details !== undefined) body.error.details = details;
      res.status(status).json(body);
    };

    if (error instanceof AppError) return send(error.statusCode, error.code, error.message, error.details);

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
      return send(400, 'VALIDATION_ERROR', 'Validation failed', details);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return send(409, 'CONFLICT', 'Resource already exists');
      if (error.code === 'P2025') return send(404, 'NOT_FOUND', 'Resource not found');
      if (error.code === 'P2003') return send(409, 'CONFLICT', 'Operation conflicts with related data');
    }

    const parserType = bodyParserErrorType(error);
    if (parserType === 'entity.parse.failed') return send(400, 'INVALID_JSON', 'Request body is not valid JSON');
    if (parserType === 'entity.too.large') return send(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');

    logger.log('Unhandled error:', error);
    const message = !isProduction && error instanceof Error ? error.message : GENERIC_MESSAGE;
    return send(500, 'INTERNAL_ERROR', message);
  };
}
