import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../helpers/testContext';

const ctx = createTestContext();
const missingId = '3f2b8c1e-8a4d-4b53-9d0e-0a1b2c3d4e5f';
let admin: Awaited<ReturnType<typeof ctx.createUser>>;
let customer: Awaited<ReturnType<typeof ctx.createUser>>;

beforeEach(async () => {
  await ctx.resetDatabase();
  admin = await ctx.createUser({ role: 'ADMIN', email: 'admin@example.com' });
  customer = await ctx.createUser({ role: 'CUSTOMER', email: 'customer@example.com' });
});
afterAll(() => ctx.close());

const buy = (id: string, auth: string, body?: object) => {
  const req = request(ctx.app).post(`/api/vehicles/${id}/purchase`).set('Authorization', auth);
  return body === undefined ? req : req.send(body);
};
const stockOf = async (id: string) => (await ctx.prisma.vehicle.findUniqueOrThrow({ where: { id } })).quantity;

describe('POST /api/vehicles/:id/purchase', () => {
  it('buys 1 unit by default, returns inventory + confirmation and persists both', async () => {
    const v = await ctx.createVehicle({ price: 19999.99, quantity: 5 });
    const res = await buy(v.id, customer.auth);
    expect(res.status).toBe(201);
    expect(res.body.data.vehicle.quantity).toBe(4);
    expect(res.body.data.purchase).toMatchObject({ quantity: 1, unitPrice: 19999.99, totalPrice: 19999.99 });
    expect(res.body.data.message).toMatch(/confirmed/i);
    expect(await stockOf(v.id)).toBe(4);
    const rows = await ctx.prisma.purchase.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: customer.user.id, vehicleId: v.id, quantity: 1 });
  });

  it('buys several units and computes an exact total', async () => {
    const v = await ctx.createVehicle({ price: 19999.99, quantity: 5 });
    const res = await buy(v.id, customer.auth, { quantity: 3 });
    expect(res.status).toBe(201);
    expect(res.body.data.vehicle.quantity).toBe(2);
    expect(res.body.data.purchase.totalPrice).toBe(59999.97);
  });

  it('allows an ADMIN to purchase too (any authenticated user)', async () => {
    const v = await ctx.createVehicle();
    expect((await buy(v.id, admin.auth)).status).toBe(201);
  });

  it('allows buying exactly the remaining stock, leaving 0', async () => {
    const v = await ctx.createVehicle({ quantity: 2 });
    expect((await buy(v.id, customer.auth, { quantity: 2 })).status).toBe(201);
    expect(await stockOf(v.id)).toBe(0);
  });

  it('409 INSUFFICIENT_STOCK when the vehicle is sold out', async () => {
    const v = await ctx.createVehicle({ quantity: 0 });
    const res = await buy(v.id, customer.auth);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(await stockOf(v.id)).toBe(0);
    expect(await ctx.prisma.purchase.count()).toBe(0);
  });

  it('409 when asking for more than is in stock, and stock is untouched', async () => {
    const v = await ctx.createVehicle({ quantity: 2 });
    const res = await buy(v.id, customer.auth, { quantity: 3 });
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ available: 2, requested: 3 });
    expect(await stockOf(v.id)).toBe(2);
  });

  it.each([[{ quantity: 0 }], [{ quantity: -1 }], [{ quantity: 1.5 }], [{ quantity: '2' }], [{ quantity: null }], [{ quantity: 100000 }]])(
    'rejects invalid quantity %j with 400 and changes nothing',
    async (body) => {
      const v = await ctx.createVehicle({ quantity: 5 });
      const res = await buy(v.id, customer.auth, body);
      expect(res.status).toBe(400);
      expect(await stockOf(v.id)).toBe(5);
    },
  );

  it('404 for an unknown vehicle, 400 for a malformed id, 401 without a token', async () => {
    expect((await buy(missingId, customer.auth)).status).toBe(404);
    expect((await buy('nope', customer.auth)).status).toBe(400);
    expect((await request(ctx.app).post(`/api/vehicles/${missingId}/purchase`)).status).toBe(401);
  });
});

describe('concurrent purchases (no overselling, never negative)', () => {
  it('20 parallel single-unit purchases of 5 units: exactly 5 succeed, 15 get 409', async () => {
    const v = await ctx.createVehicle({ quantity: 5 });
    const results = await Promise.all(Array.from({ length: 20 }, () => buy(v.id, customer.auth)));
    const ok = results.filter((r) => r.status === 201).length;
    const rejected = results.filter((r) => r.status === 409).length;
    expect(ok).toBe(5);
    expect(rejected).toBe(15);
    expect(await stockOf(v.id)).toBe(0);
    expect(await ctx.prisma.purchase.count()).toBe(5);
  });

  it('parallel multi-unit purchases: units sold + remaining always equals the initial stock', async () => {
    const v = await ctx.createVehicle({ quantity: 10 });
    const results = await Promise.all(Array.from({ length: 8 }, () => buy(v.id, customer.auth, { quantity: 3 })));
    const sold = results.filter((r) => r.status === 201).length * 3;
    const remaining = await stockOf(v.id);
    expect(sold).toBe(9); // only 3 of the 8 requests can fit in 10 units
    expect(remaining).toBe(1);
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(true);
  });

  it('the database itself refuses negative stock (CHECK constraint)', async () => {
    const v = await ctx.createVehicle({ quantity: 1 });
    await expect(ctx.prisma.vehicle.update({ where: { id: v.id }, data: { quantity: -1 } })).rejects.toThrow();
    expect(await stockOf(v.id)).toBe(1);
  });
});

describe('POST /api/vehicles/:id/restock', () => {
  it('lets an ADMIN add stock and persists it', async () => {
    const v = await ctx.createVehicle({ quantity: 2 });
    const res = await request(ctx.app).post(`/api/vehicles/${v.id}/restock`).set('Authorization', admin.auth).send({ quantity: 10 });
    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(12);
    expect(await stockOf(v.id)).toBe(12);
  });

  it('makes a sold-out vehicle purchasable again', async () => {
    const v = await ctx.createVehicle({ quantity: 0 });
    await request(ctx.app).post(`/api/vehicles/${v.id}/restock`).set('Authorization', admin.auth).send({ quantity: 1 });
    expect((await buy(v.id, customer.auth)).status).toBe(201);
  });

  it('rejects a CUSTOMER with 403 and leaves stock unchanged', async () => {
    const v = await ctx.createVehicle({ quantity: 2 });
    const res = await request(ctx.app).post(`/api/vehicles/${v.id}/restock`).set('Authorization', customer.auth).send({ quantity: 10 });
    expect(res.status).toBe(403);
    expect(await stockOf(v.id)).toBe(2);
  });

  it.each([[{ quantity: 0 }], [{ quantity: -5 }], [{ quantity: 1.5 }], [{}], [{ quantity: 'x' }]])('rejects invalid quantity %j with 400', async (body) => {
    const v = await ctx.createVehicle({ quantity: 2 });
    const res = await request(ctx.app).post(`/api/vehicles/${v.id}/restock`).set('Authorization', admin.auth).send(body);
    expect(res.status).toBe(400);
    expect(await stockOf(v.id)).toBe(2);
  });

  it('404 for a missing vehicle, 401 without a token', async () => {
    expect((await request(ctx.app).post(`/api/vehicles/${missingId}/restock`).set('Authorization', admin.auth).send({ quantity: 1 })).status).toBe(404);
    expect((await request(ctx.app).post(`/api/vehicles/${missingId}/restock`).send({ quantity: 1 })).status).toBe(401);
  });

  it('concurrent restocks never lose updates', async () => {
    const v = await ctx.createVehicle({ quantity: 0 });
    await Promise.all(Array.from({ length: 10 }, () => request(ctx.app).post(`/api/vehicles/${v.id}/restock`).set('Authorization', admin.auth).send({ quantity: 2 })));
    expect(await stockOf(v.id)).toBe(20);
  });
});

describe('purchase audit trail', () => {
  it('survives deletion of the vehicle (vehicleId becomes null, name snapshot kept)', async () => {
    const v = await ctx.createVehicle({ make: 'Honda', model: 'Civic', quantity: 3 });
    await buy(v.id, customer.auth, { quantity: 2 });
    const del = await request(ctx.app).delete(`/api/vehicles/${v.id}`).set('Authorization', admin.auth);
    expect(del.status).toBe(204);
    const rows = await ctx.prisma.purchase.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ vehicleId: null, vehicleName: 'Honda Civic', quantity: 2 });
  });
});
