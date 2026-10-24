import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOKEN_STORAGE_KEY, UNAUTHORIZED_EVENT, api, getErrorCode, getErrorMessage } from '../src/api/client';
import * as endpoints from '../src/api/endpoints';

// These tests use the REAL axios instance and endpoint functions with a fake network adapter.
let seen: InternalAxiosRequestConfig[];
const originalAdapter = api.defaults.adapter;

function respondWith(status: number, body: unknown) {
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    const response = { data: body, status, statusText: String(status), headers: {}, config };
    if (status >= 400) throw new AxiosError(`HTTP ${status}`, 'ERR_BAD_REQUEST', config, null, response);
    return response;
  };
  api.defaults.adapter = adapter;
}

beforeEach(() => {
  seen = [];
});
afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe('request interceptor', () => {
  it('attaches the Bearer token from storage on every call', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'abc123');
    respondWith(200, { success: true, data: { totalVehicles: 1 } });
    await endpoints.fetchStats();
    expect(seen[0]?.headers.get('Authorization')).toBe('Bearer abc123');
    expect(seen[0]?.url).toBe('/vehicles/stats');
  });

  it('sends no Authorization header when logged out', async () => {
    respondWith(200, { success: true, data: { user: { id: 'u' }, token: 't' } });
    await endpoints.login('a@b.co', 'x');
    expect(seen[0]?.headers.get('Authorization')).toBeFalsy();
  });
});

describe('endpoint helpers unwrap the API envelope', () => {
  it('searchVehicles returns items + meta and forwards query params', async () => {
    respondWith(200, { success: true, data: [{ id: 'v1' }], meta: { page: 2, limit: 5, total: 6, totalPages: 2 } });
    const result = await endpoints.searchVehicles({ page: 2, make: 'toy' });
    expect(result).toEqual({ items: [{ id: 'v1' }], meta: { page: 2, limit: 5, total: 6, totalPages: 2 } });
    expect(seen[0]?.params).toEqual({ page: 2, make: 'toy' });
  });

  it('purchaseVehicle posts the quantity and returns the confirmation', async () => {
    respondWith(201, { success: true, data: { message: 'Purchase confirmed' } });
    expect(await endpoints.purchaseVehicle('v1', 2)).toEqual({ message: 'Purchase confirmed' });
    expect(seen[0]?.method).toBe('post');
    expect(seen[0]?.url).toBe('/vehicles/v1/purchase');
    expect(JSON.parse(String(seen[0]?.data))).toEqual({ quantity: 2 });
  });

  it('uses the right verbs and paths for the other calls', async () => {
    respondWith(200, { success: true, data: { user: { id: 'u' } } });
    await endpoints.fetchMe();
    await endpoints.getVehicle('v1');
    await endpoints.listVehicles({ availability: 'all' });
    await endpoints.createVehicle({ make: 'a', model: 'b', category: 'c', price: 1, quantity: 1, year: null, description: null, imageUrl: null });
    await endpoints.updateVehicle('v1', { make: 'a', model: 'b', category: 'c', price: 1, quantity: 1, year: null, description: null, imageUrl: null });
    await endpoints.restockVehicle('v1', 3);
    await endpoints.deleteVehicle('v1');
    await endpoints.register('N', 'a@b.co', 'Passw0rdX');
    expect(seen.map((c) => `${c.method} ${c.url}`)).toEqual([
      'get /auth/me',
      'get /vehicles/v1',
      'get /vehicles',
      'post /vehicles',
      'put /vehicles/v1',
      'post /vehicles/v1/restock',
      'delete /vehicles/v1',
      'post /auth/register',
    ]);
  });
});

describe('401 handling', () => {
  it('clears the token and announces it when an authenticated call is rejected', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'expired');
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    respondWith(401, { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Token expired' } });
    await expect(endpoints.fetchStats()).rejects.toBeTruthy();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire the logout event for a failed login (no token was sent)', async () => {
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    respondWith(401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    await expect(endpoints.login('a@b.co', 'x')).rejects.toBeTruthy();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('error helpers', () => {
  const axiosError = (response?: { status: number; data: unknown }) =>
    new AxiosError('boom', 'ERR', undefined, null, response ? ({ ...response, statusText: '', headers: {}, config: {} as InternalAxiosRequestConfig } as never) : undefined);

  it('prefers the server message and appends field details', () => {
    const error = axiosError({ status: 400, data: { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ field: 'price', message: 'too low' }] } } });
    expect(getErrorMessage(error)).toBe('Validation failed (price: too low)');
    expect(getErrorCode(error)).toBe('VALIDATION_ERROR');
  });

  it('explains network failures and falls back for unknown errors', () => {
    expect(getErrorMessage(axiosError())).toMatch(/Cannot reach the server/);
    expect(getErrorMessage(new Error('x'))).toBe('Something went wrong. Please try again.');
    expect(getErrorCode(new Error('x'))).toBeUndefined();
  });
});
