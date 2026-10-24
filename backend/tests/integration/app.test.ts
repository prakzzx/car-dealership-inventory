import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestContext } from '../helpers/testContext';

const ctx = createTestContext();
afterAll(() => ctx.close());

describe('GET /api/health', () => {
  it('reports ok and database up without authentication', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'up' });
  });
});

describe('platform behaviour', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(ctx.app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('sends security headers and hides x-powered-by', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows configured CORS origins only', async () => {
    const allowed = await request(ctx.app).get('/api/health').set('Origin', 'http://localhost:5173');
    const denied = await request(ctx.app).get('/api/health').set('Origin', 'http://evil.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects oversized request bodies with 413', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(ctx.app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
