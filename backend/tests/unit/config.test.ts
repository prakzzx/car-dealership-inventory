import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('loadConfig', () => {
  it('applies safe defaults', () => {
    const config = loadConfig(valid);
    expect(config.port).toBe(4000);
    expect(config.jwtExpiresIn).toBe('1h');
    expect(config.nodeEnv).toBe('development');
    expect(config.clientUrls).toEqual(['http://localhost:5173']);
  });

  it('splits CLIENT_URL on commas and trims', () => {
    const config = loadConfig({ ...valid, CLIENT_URL: 'http://a.com, http://b.com ' });
    expect(config.clientUrls).toEqual(['http://a.com', 'http://b.com']);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => loadConfig({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('throws when JWT_SECRET is shorter than 32 characters', () => {
    expect(() => loadConfig({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('refuses the placeholder dev secret in production', () => {
    expect(() =>
      loadConfig({ ...valid, NODE_ENV: 'production', JWT_SECRET: 'dev-only-change-me-use-a-long-random-string-at-least-32-chars' }),
    ).toThrow(/JWT_SECRET/);
  });
});
