import type { PagedResult, User, Vehicle, VehicleStats } from '../src/types';

export const customerUser: User = { id: 'u-customer', name: 'Casey Customer', email: 'casey@example.com', role: 'CUSTOMER', createdAt: '2026-01-01T00:00:00.000Z' };
export const adminUser: User = { id: 'u-admin', name: 'Alex Admin', email: 'admin@example.com', role: 'ADMIN', createdAt: '2026-01-01T00:00:00.000Z' };

export function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v-1',
    make: 'Toyota',
    model: 'Camry',
    category: 'Sedan',
    price: 28995,
    quantity: 5,
    year: 2024,
    description: 'Comfortable midsize sedan.',
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function paged(items: Vehicle[], meta: Partial<PagedResult<Vehicle>['meta']> = {}): PagedResult<Vehicle> {
  return { items, meta: { page: 1, limit: 12, total: items.length, totalPages: 1, ...meta } };
}

export const stats: VehicleStats = {
  totalVehicles: 12,
  totalStock: 45,
  inStockVehicles: 11,
  outOfStockVehicles: 1,
  categories: [
    { category: 'Sedan', count: 2, stock: 14 },
    { category: 'SUV', count: 2, stock: 8 },
  ],
};

/** Shape axios produces for a failed HTTP call, as far as our code inspects it. */
export function apiError(status: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { isAxiosError: true, response: { status, data: { success: false, error: { code, message, details } } } });
}

/** Pre-fill the persisted cart for a user (same storage key/format the app uses). */
export function seedCart(userId: string, items: { vehicle: Vehicle; quantity: number }[]) {
  localStorage.setItem(`autohub.cart.${userId}`, JSON.stringify(items));
}
