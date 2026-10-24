import { describe, expect, it } from 'vitest';
import { createVehicleSchema, listQuerySchema, searchQuerySchema, vehicleIdSchema } from '../../src/modules/vehicles/vehicle.schemas';

const valid = { make: 'Toyota', model: 'Camry', category: 'Sedan', price: 25999.99, quantity: 3 };

describe('createVehicleSchema', () => {
  it('accepts a minimal valid vehicle and trims strings', () => {
    const parsed = createVehicleSchema.parse({ ...valid, make: '  Toyota ' });
    expect(parsed.make).toBe('Toyota');
  });

  it.each([
    ['missing make', { ...valid, make: '' }],
    ['negative price', { ...valid, price: -1 }],
    ['zero price', { ...valid, price: 0 }],
    ['price with 3 decimals', { ...valid, price: 10.999 }],
    ['negative quantity', { ...valid, quantity: -1 }],
    ['fractional quantity', { ...valid, quantity: 1.5 }],
    ['string price', { ...valid, price: '100' }],
    ['year too old', { ...valid, year: 1800 }],
    ['year too far in the future', { ...valid, year: 3000 }],
    ['javascript: image URL', { ...valid, imageUrl: 'javascript:alert(1)' }],
    ['not a URL', { ...valid, imageUrl: 'car.png' }],
  ])('rejects %s', (_name, input) => {
    expect(createVehicleSchema.safeParse(input).success).toBe(false);
  });

  it('allows null for optional fields so they can be cleared', () => {
    expect(createVehicleSchema.safeParse({ ...valid, year: null, description: null, imageUrl: null }).success).toBe(true);
  });
});

describe('listQuerySchema', () => {
  it('applies defaults', () => {
    expect(listQuerySchema.parse({})).toMatchObject({ page: 1, limit: 12, sortBy: 'createdAt', sortOrder: 'desc', availability: 'in_stock' });
  });

  it('coerces numeric strings from the query string', () => {
    expect(listQuerySchema.parse({ page: '2', limit: '5' })).toMatchObject({ page: 2, limit: 5 });
  });

  it.each([
    ['page 0', { page: '0' }],
    ['limit above 100', { limit: '101' }],
    ['unknown sort field', { sortBy: 'passwordHash' }],
    ['bad sort order', { sortOrder: 'sideways' }],
    ['bad availability', { availability: 'maybe' }],
    ['unknown parameter', { foo: 'bar' }],
  ])('rejects %s', (_name, input) => {
    expect(listQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe('searchQuerySchema', () => {
  it('parses filters and coerces numbers', () => {
    expect(searchQuerySchema.parse({ make: 'toy', minPrice: '1000', maxPrice: '5000', year: '2022' })).toMatchObject({
      make: 'toy',
      minPrice: 1000,
      maxPrice: 5000,
      year: 2022,
    });
  });

  it('treats empty strings as "not provided" (forms send them)', () => {
    const parsed = searchQuerySchema.parse({ make: '', minPrice: '', year: '' });
    expect(parsed.make).toBeUndefined();
    expect(parsed.minPrice).toBeUndefined();
    expect(parsed.year).toBeUndefined();
  });

  it.each([
    ['non-numeric minPrice', { minPrice: 'abc' }],
    ['negative minPrice', { minPrice: '-5' }],
    ['minPrice greater than maxPrice', { minPrice: '500', maxPrice: '100' }],
    ['array value', { make: ['a', 'b'] }],
    ['invalid year', { year: '20x2' }],
  ])('rejects %s', (_name, input) => {
    expect(searchQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe('vehicleIdSchema', () => {
  it('requires a uuid', () => {
    expect(vehicleIdSchema.safeParse('nope').success).toBe(false);
    expect(vehicleIdSchema.safeParse('3f2b8c1e-8a4d-4b53-9d0e-0a1b2c3d4e5f').success).toBe(true);
  });
});
