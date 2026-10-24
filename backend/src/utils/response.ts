import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Every successful response has the shape { success: true, data, meta? }. */
export function sendSuccess<T>(res: Response, data: T, options: { status?: number; meta?: PaginationMeta } = {}): void {
  const body: { success: true; data: T; meta?: PaginationMeta } = { success: true, data };
  if (options.meta) body.meta = options.meta;
  res.status(options.status ?? 200).json(body);
}
