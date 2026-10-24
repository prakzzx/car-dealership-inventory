import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_PASSWORD, createTestContext } from '../helpers/testContext';

const ctx = createTestContext();
const valid = { name: 'Ann Customer', email: 'ann@example.com', password: TEST_PASSWORD };

beforeEach(() => ctx.resetDatabase());
afterAll(() => ctx.close());

describe('POST /api/auth/register', () => {
  it('creates a CUSTOMER, returns 201 with a token and never returns the hash', async () => {
    const res = await request(ctx.app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ name: valid.name, email: valid.email, role: 'CUSTOMER' });
    expect(typeof res.body.data.token).toBe('string');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('stores a bcrypt hash, not the plaintext password', async () => {
    await request(ctx.app).post('/api/auth/register').send(valid);
    const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { email: valid.email } });
    expect(stored.passwordHash).not.toBe(valid.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare(valid.password, stored.passwordHash)).toBe(true);
  });

  it('issues a token that is immediately usable (automatic login)', async () => {
    const reg = await request(ctx.app).post('/api/auth/register').send(valid);
    const me = await request(ctx.app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(valid.email);
  });

  it('ignores a role sent by the client: public registration can never create an ADMIN', async () => {
    const res = await request(ctx.app).post('/api/auth/register').send({ ...valid, role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { email: valid.email } });
    expect(stored.role).toBe('CUSTOMER');
  });

  it('rejects a duplicate email with 409 (case-insensitive)', async () => {
    await request(ctx.app).post('/api/auth/register').send(valid);
    const res = await request(ctx.app).post('/api/auth/register').send({ ...valid, email: 'ANN@Example.com' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, error: { code: 'CONFLICT' } });
  });

  it('rejects an invalid email with 400 and field details', async () => {
    const res = await request(ctx.app).post('/api/auth/register').send({ ...valid, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain('email');
  });

  it.each([
    ['too short', 'Ab1'],
    ['no uppercase', 'alllowercase1'],
    ['no lowercase', 'ALLUPPERCASE1'],
    ['no digit', 'NoDigitsHereAtAll'],
  ])('rejects a weak password (%s)', async (_label, password) => {
    const res = await request(ctx.app).post('/api/auth/register').send({ ...valid, password });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain('password');
  });

  it('rejects a missing name', async () => {
    const res = await request(ctx.app).post('/api/auth/register').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a signed JWT with the user id and role on success', async () => {
    const { user, password } = await ctx.createUser({ email: 'login@example.com', role: 'ADMIN' });
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'login@example.com', password });

    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.data.token, ctx.config.jwtSecret) as jwt.JwtPayload;
    expect(payload.sub).toBe(user.id);
    expect(payload.role).toBe('ADMIN');
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns an identical generic 401 for a wrong password and an unknown email', async () => {
    await ctx.createUser({ email: 'known@example.com' });
    const wrongPassword = await request(ctx.app).post('/api/auth/login').send({ email: 'known@example.com', password: 'WrongPassw0rd' });
    const unknownEmail = await request(ctx.app).post('/api/auth/login').send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('rejects a malformed body with 400', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('token handling on protected routes (GET /api/auth/me)', () => {
  it('401 without a token', async () => {
    const res = await request(ctx.app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 with a malformed Authorization header', async () => {
    const res = await request(ctx.app).get('/api/auth/me').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  it('401 with a token signed by someone else', async () => {
    const forged = jwt.sign({ sub: 'x', role: 'ADMIN' }, 'attacker-secret-attacker-secret-123456');
    const res = await request(ctx.app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('401 with code TOKEN_EXPIRED for an expired token', async () => {
    const { user } = await ctx.createUser();
    const expired = jwt.sign({ sub: user.id, role: user.role }, ctx.config.jwtSecret, { expiresIn: -60 });
    const res = await request(ctx.app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('401 when the token belongs to a user that no longer exists', async () => {
    const { user, auth } = await ctx.createUser();
    await ctx.prisma.user.delete({ where: { id: user.id } });
    const res = await request(ctx.app).get('/api/auth/me').set('Authorization', auth);
    expect(res.status).toBe(401);
  });
});

describe('rate limiting on auth routes', () => {
  it('returns 429 after too many attempts', async () => {
    const limited = createTestContext({ authRateLimitMax: 3 });
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const res = await request(limited.app).post('/api/auth/login').send({ email: 'a@example.com', password: 'WrongPassw0rd' });
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
      expect(statuses.slice(3)).toEqual([429, 429]);
    } finally {
      await limited.close();
    }
  });
});
