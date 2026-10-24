import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../helpers/testContext';

const ctx = createTestContext();
const newVehicle = { make: 'Toyota', model: 'Camry', category: 'Sedan', price: 24999.99, quantity: 4, year: 2024, description: 'Reliable.', imageUrl: 'https://example.com/camry.jpg' };
const missingId = '3f2b8c1e-8a4d-4b53-9d0e-0a1b2c3d4e5f';

let admin: Awaited<ReturnType<typeof ctx.createUser>>;
let customer: Awaited<ReturnType<typeof ctx.createUser>>;

beforeEach(async () => {
  await ctx.resetDatabase();
  admin = await ctx.createUser({ role: 'ADMIN', email: 'admin@example.com' });
  customer = await ctx.createUser({ role: 'CUSTOMER', email: 'customer@example.com' });
});
afterAll(() => ctx.close());

describe('authentication is required on every vehicle route', () => {
  it.each([
    ['get', '/api/vehicles'],
    ['get', '/api/vehicles/search'],
    ['get', '/api/vehicles/stats'],
    ['get', `/api/vehicles/${missingId}`],
    ['post', '/api/vehicles'],
    ['put', `/api/vehicles/${missingId}`],
    ['delete', `/api/vehicles/${missingId}`],
  ] as const)('%s %s -> 401 without a token', async (method, url) => {
    const res = await request(ctx.app)[method](url);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/vehicles', () => {
  it('lets an ADMIN create a vehicle (201) and persists the exact decimal price', async () => {
    const res = await request(ctx.app).post('/api/vehicles').set('Authorization', admin.auth).send(newVehicle);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ make: 'Toyota', model: 'Camry', price: 24999.99, quantity: 4 });
    const stored = await ctx.prisma.vehicle.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(stored.price.toString()).toBe('24999.99');
  });

  it('blocks a CUSTOMER with 403 and creates nothing', async () => {
    const res = await request(ctx.app).post('/api/vehicles').set('Authorization', customer.auth).send(newVehicle);
    expect(res.status).toBe(403);
    expect(await ctx.prisma.vehicle.count()).toBe(0);
  });

  it.each([
    ['missing make', { ...newVehicle, make: '' }],
    ['negative price', { ...newVehicle, price: -5 }],
    ['negative quantity', { ...newVehicle, quantity: -1 }],
    ['fractional quantity', { ...newVehicle, quantity: 1.5 }],
    ['price with too many decimals', { ...newVehicle, price: 1.999 }],
    ['unsafe image URL', { ...newVehicle, imageUrl: 'javascript:alert(1)' }],
  ])('rejects %s with 400', async (_name, body) => {
    const res = await request(ctx.app).post('/api/vehicles').set('Authorization', admin.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/vehicles (list)', () => {
  it('returns only in-stock vehicles by default', async () => {
    await ctx.createVehicle({ model: 'InStock', quantity: 2 });
    await ctx.createVehicle({ model: 'SoldOut', quantity: 0 });
    const res = await request(ctx.app).get('/api/vehicles').set('Authorization', customer.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.map((v: { model: string }) => v.model)).toEqual(['InStock']);
  });

  it('supports availability=all and availability=out_of_stock', async () => {
    await ctx.createVehicle({ model: 'InStock', quantity: 2 });
    await ctx.createVehicle({ model: 'SoldOut', quantity: 0 });
    const all = await request(ctx.app).get('/api/vehicles?availability=all').set('Authorization', customer.auth);
    const out = await request(ctx.app).get('/api/vehicles?availability=out_of_stock').set('Authorization', customer.auth);
    expect(all.body.data).toHaveLength(2);
    expect(out.body.data.map((v: { model: string }) => v.model)).toEqual(['SoldOut']);
  });

  it('paginates and reports metadata', async () => {
    for (let i = 0; i < 25; i += 1) await ctx.createVehicle({ model: `M${String(i).padStart(2, '0')}` });
    const page2 = await request(ctx.app).get('/api/vehicles?page=2&limit=10').set('Authorization', customer.auth);
    const page3 = await request(ctx.app).get('/api/vehicles?page=3&limit=10').set('Authorization', customer.auth);
    const beyond = await request(ctx.app).get('/api/vehicles?page=9&limit=10').set('Authorization', customer.auth);
    expect(page2.body.data).toHaveLength(10);
    expect(page2.body.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    expect(page3.body.data).toHaveLength(5);
    expect(beyond.status).toBe(200);
    expect(beyond.body.data).toEqual([]);
  });

  it('never repeats or skips items across pages (stable ordering)', async () => {
    for (let i = 0; i < 12; i += 1) await ctx.createVehicle({ model: `M${i}`, price: 10000 });
    const a = await request(ctx.app).get('/api/vehicles?sortBy=price&limit=6&page=1').set('Authorization', customer.auth);
    const b = await request(ctx.app).get('/api/vehicles?sortBy=price&limit=6&page=2').set('Authorization', customer.auth);
    const ids = [...a.body.data, ...b.body.data].map((v: { id: string }) => v.id);
    expect(new Set(ids).size).toBe(12);
  });

  it('sorts by price ascending and descending', async () => {
    await ctx.createVehicle({ model: 'B', price: 30000 });
    await ctx.createVehicle({ model: 'A', price: 10000 });
    await ctx.createVehicle({ model: 'C', price: 20000 });
    const asc = await request(ctx.app).get('/api/vehicles?sortBy=price&sortOrder=asc').set('Authorization', customer.auth);
    const desc = await request(ctx.app).get('/api/vehicles?sortBy=price&sortOrder=desc').set('Authorization', customer.auth);
    expect(asc.body.data.map((v: { price: number }) => v.price)).toEqual([10000, 20000, 30000]);
    expect(desc.body.data.map((v: { price: number }) => v.price)).toEqual([30000, 20000, 10000]);
  });

  it('sorts by make alphabetically', async () => {
    await ctx.createVehicle({ make: 'Mazda' });
    await ctx.createVehicle({ make: 'Audi' });
    const res = await request(ctx.app).get('/api/vehicles?sortBy=make&sortOrder=asc').set('Authorization', customer.auth);
    expect(res.body.data.map((v: { make: string }) => v.make)).toEqual(['Audi', 'Mazda']);
  });

  it.each(['page=0', 'limit=1000', 'sortBy=passwordHash', 'sortOrder=up', 'availability=maybe', 'page=abc', 'unknown=1'])(
    'rejects invalid parameter %s with 400',
    async (qs) => {
      const res = await request(ctx.app).get(`/api/vehicles?${qs}`).set('Authorization', customer.auth);
      expect(res.status).toBe(400);
    },
  );
});

describe('GET /api/vehicles/search', () => {
  beforeEach(async () => {
    await ctx.createVehicle({ make: 'Toyota', model: 'Camry', category: 'Sedan', price: 25000, year: 2022 });
    await ctx.createVehicle({ make: 'Toyota', model: 'RAV4', category: 'SUV', price: 32000, year: 2024 });
    await ctx.createVehicle({ make: 'Ford', model: 'F-150', category: 'Truck', price: 45000, year: 2023 });
    await ctx.createVehicle({ make: 'Honda', model: 'Civic', category: 'Sedan', price: 22000, year: 2022, quantity: 0 });
  });
  const search = (qs: string) => request(ctx.app).get(`/api/vehicles/search?${qs}`).set('Authorization', customer.auth);
  const models = (res: request.Response) => res.body.data.map((v: { model: string }) => v.model).sort();

  it('is not swallowed by the /:id route', async () => {
    const res = await search('');
    expect(res.status).toBe(200);
  });

  it('matches make case-insensitively and partially', async () => {
    expect(models(await search('make=TOY'))).toEqual(['Camry', 'RAV4']);
  });

  it('matches model partially', async () => {
    expect(models(await search('model=150'))).toEqual(['F-150']);
  });

  it('matches category partially, case-insensitive', async () => {
    expect(models(await search('category=truc'))).toEqual(['F-150']);
  });

  it('filters by price range (inclusive)', async () => {
    expect(models(await search('minPrice=25000&maxPrice=32000'))).toEqual(['Camry', 'RAV4']);
    expect(models(await search('minPrice=40000'))).toEqual(['F-150']);
    expect(models(await search('maxPrice=26000'))).toEqual(['Camry']);
  });

  it('filters by year', async () => {
    expect(models(await search('year=2024'))).toEqual(['RAV4']);
  });

  it('combines filters with AND', async () => {
    expect(models(await search('make=toyota&category=suv&minPrice=30000'))).toEqual(['RAV4']);
    expect((await search('make=ford&category=sedan')).body.data).toEqual([]);
  });

  it('hides out-of-stock by default and includes them with availability=all', async () => {
    expect(models(await search('category=sedan'))).toEqual(['Camry']);
    expect(models(await search('category=sedan&availability=all'))).toEqual(['Camry', 'Civic']);
    expect(models(await search('availability=out_of_stock'))).toEqual(['Civic']);
  });

  it('supports pagination and sorting together with filters', async () => {
    const res = await search('make=toyota&sortBy=price&sortOrder=desc&limit=1&page=1');
    expect(res.body.data.map((v: { model: string }) => v.model)).toEqual(['RAV4']);
    expect(res.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
  });

  it('returns 200 with an empty list when nothing matches', async () => {
    const res = await search('make=Lamborghini');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('treats LIKE wildcards in user input literally', async () => {
    expect((await search('make=%25')).body.data).toEqual([]);
    expect((await search('make=T_yota')).body.data).toEqual([]); // "_" must not match any single character
    expect(models(await search('make=Toyota'))).toEqual(['Camry', 'RAV4']);
  });

  it.each(['minPrice=abc', 'maxPrice=-1', 'minPrice=500&maxPrice=100', 'year=20x2', 'limit=0', 'make=a&make=b'])('rejects invalid filters (%s) with 400', async (qs) => {
    expect((await search(qs)).status).toBe(400);
  });
});

describe('GET /api/vehicles/stats', () => {
  it('aggregates totals and per-category counts from the database', async () => {
    await ctx.createVehicle({ category: 'Sedan', quantity: 3 });
    await ctx.createVehicle({ category: 'Sedan', quantity: 0 });
    await ctx.createVehicle({ category: 'SUV', quantity: 5 });
    const res = await request(ctx.app).get('/api/vehicles/stats').set('Authorization', customer.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalVehicles: 3, totalStock: 8, inStockVehicles: 2, outOfStockVehicles: 1 });
    expect(res.body.data.categories).toEqual([
      { category: 'SUV', count: 1, stock: 5 },
      { category: 'Sedan', count: 2, stock: 3 },
    ]);
  });

  it('returns zeros for an empty inventory', async () => {
    const res = await request(ctx.app).get('/api/vehicles/stats').set('Authorization', customer.auth);
    expect(res.body.data).toEqual({ totalVehicles: 0, totalStock: 0, inStockVehicles: 0, outOfStockVehicles: 0, categories: [] });
  });
});

describe('GET /api/vehicles/:id', () => {
  it('returns the vehicle', async () => {
    const v = await ctx.createVehicle({ model: 'Solo' });
    const res = await request(ctx.app).get(`/api/vehicles/${v.id}`).set('Authorization', customer.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: v.id, model: 'Solo' });
  });

  it('404 for an unknown id and 400 for a malformed id', async () => {
    expect((await request(ctx.app).get(`/api/vehicles/${missingId}`).set('Authorization', customer.auth)).status).toBe(404);
    expect((await request(ctx.app).get('/api/vehicles/not-a-uuid').set('Authorization', customer.auth)).status).toBe(400);
  });
});

describe('PUT /api/vehicles/:id', () => {
  it('lets an ADMIN update and persists the change', async () => {
    const v = await ctx.createVehicle({ model: 'Old', price: 10000 });
    const res = await request(ctx.app).put(`/api/vehicles/${v.id}`).set('Authorization', admin.auth).send({ ...newVehicle, model: 'New', price: 12345.5 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: v.id, model: 'New', price: 12345.5 });
    const stored = await ctx.prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } });
    expect(stored.model).toBe('New');
    expect(stored.updatedAt.getTime()).toBeGreaterThanOrEqual(v.updatedAt.getTime());
  });

  it('404 when the vehicle does not exist', async () => {
    const res = await request(ctx.app).put(`/api/vehicles/${missingId}`).set('Authorization', admin.auth).send(newVehicle);
    expect(res.status).toBe(404);
  });

  it('400 on invalid data and 403 for a CUSTOMER', async () => {
    const v = await ctx.createVehicle();
    expect((await request(ctx.app).put(`/api/vehicles/${v.id}`).set('Authorization', admin.auth).send({ ...newVehicle, price: -1 })).status).toBe(400);
    expect((await request(ctx.app).put(`/api/vehicles/${v.id}`).set('Authorization', customer.auth).send(newVehicle)).status).toBe(403);
  });
});

describe('DELETE /api/vehicles/:id', () => {
  it('lets an ADMIN delete (204) and the row is gone', async () => {
    const v = await ctx.createVehicle();
    const res = await request(ctx.app).delete(`/api/vehicles/${v.id}`).set('Authorization', admin.auth);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await ctx.prisma.vehicle.count()).toBe(0);
  });

  it('404 for a missing vehicle, 403 for a CUSTOMER (and the row survives)', async () => {
    const v = await ctx.createVehicle();
    expect((await request(ctx.app).delete(`/api/vehicles/${missingId}`).set('Authorization', admin.auth)).status).toBe(404);
    expect((await request(ctx.app).delete(`/api/vehicles/${v.id}`).set('Authorization', customer.auth)).status).toBe(403);
    expect(await ctx.prisma.vehicle.count()).toBe(1);
  });
});
