import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 4 does not catch rejected promises; this forwards them to the error middleware. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
