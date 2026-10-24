import type { Role } from '../domain/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware from a verified JWT. */
      user?: { id: string; role: Role };
    }
  }
}

export {};
