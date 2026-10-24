import { z } from 'zod';
import { SORT_FIELDS } from '../../domain/vehicle';

const MAX_PRICE = 9_999_999_999.99;
const hasAtMostTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

// Only http(s) URLs: blocks javascript:/data: payloads from ever reaching an <img src>.
const imageUrl = z
  .string()
  .trim()
  .url('Image URL must be a valid URL')
  .max(2048)
  .refine((u) => /^https?:\/\//i.test(u), 'Image URL must start with http:// or https://');

const maxYear = () => new Date().getFullYear() + 2;

/** Used for POST and PUT (PUT replaces the whole resource, so the same required fields apply). */
export const createVehicleSchema = z.object({
  make: text('Make', 60),
  model: text('Model', 60),
  category: text('Category', 40),
  price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .positive('Price must be greater than 0')
    .max(MAX_PRICE, 'Price is too large')
    .refine(hasAtMostTwoDecimals, 'Price can have at most 2 decimal places'),
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' }).int('Quantity must be a whole number').min(0, 'Quantity cannot be negative').max(100_000),
  year: z.number().int('Year must be a whole number').min(1886, 'Year is too early').refine((y) => y <= maxYear(), 'Year is too far in the future').nullish(),
  description: z.string().trim().max(2000).nullish(),
  imageUrl: imageUrl.nullish(),
});
export const updateVehicleSchema = createVehicleSchema;

export const vehicleIdSchema = z.string().uuid('Vehicle id must be a valid UUID');

/** HTML forms send "" for empty inputs; treat that as "not provided" instead of coercing it to 0. */
const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalText = z.preprocess(blankToUndefined, z.string().trim().min(1).max(100).optional());
const optionalMoney = z.preprocess(blankToUndefined, z.coerce.number().min(0, 'Must be 0 or more').max(MAX_PRICE).optional());
const optionalYear = z.preprocess(blankToUndefined, z.coerce.number().int().min(1886).max(maxYear()).optional());

const paging = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  sortBy: z.enum(SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Default hides sold-out vehicles; clients opt in to seeing them.
  availability: z.enum(['in_stock', 'out_of_stock', 'all']).default('in_stock'),
};

// .strict(): unknown query parameters are a client bug, so we say so instead of silently ignoring them.
export const listQuerySchema = z.object(paging).strict();

export const searchQuerySchema = z
  .object({ ...paging, make: optionalText, model: optionalText, category: optionalText, minPrice: optionalMoney, maxPrice: optionalMoney, year: optionalYear })
  .strict()
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice must not be greater than maxPrice',
    path: ['minPrice'],
  });
