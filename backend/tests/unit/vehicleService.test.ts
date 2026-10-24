import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vehicle, VehicleQuery } from '../../src/domain/vehicle';
import { NotFoundError } from '../../src/errors/AppError';
import type { VehicleRepository } from '../../src/modules/vehicles/vehicle.repository';
import { VehicleService } from '../../src/modules/vehicles/vehicle.service';

const now = new Date('2026-01-01T00:00:00Z');
const camry: Vehicle = { id: 'v1', make: 'Toyota', model: 'Camry', category: 'Sedan', price: 25000, quantity: 3, year: 2024, description: null, imageUrl: null, createdAt: now, updatedAt: now };
const baseQuery: VehicleQuery = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc', availability: 'in_stock' };

let repo: { [K in keyof VehicleRepository]: ReturnType<typeof vi.fn> };
let service: VehicleService;

beforeEach(() => {
  repo = { create: vi.fn(), findById: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn(), getStats: vi.fn() };
  service = new VehicleService(repo as unknown as VehicleRepository);
});

describe('VehicleService', () => {
  it('create delegates to the repository and returns the new vehicle', async () => {
    repo.create.mockResolvedValue(camry);
    const input = { make: 'Toyota', model: 'Camry', category: 'Sedan', price: 25000, quantity: 3 };
    expect(await service.create(input)).toBe(camry);
    expect(repo.create).toHaveBeenCalledWith(input);
  });

  it('getById returns the vehicle or throws NotFoundError', async () => {
    repo.findById.mockResolvedValueOnce(camry).mockResolvedValueOnce(null);
    expect(await service.getById('v1')).toBe(camry);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update throws NotFoundError when the repository finds nothing', async () => {
    repo.update.mockResolvedValue(null);
    await expect(service.update('missing', { make: 'a', model: 'b', category: 'c', price: 1, quantity: 0 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update returns the updated vehicle', async () => {
    repo.update.mockResolvedValue({ ...camry, price: 1 });
    expect((await service.update('v1', { make: 'a', model: 'b', category: 'c', price: 1, quantity: 0 })).price).toBe(1);
  });

  it('remove throws NotFoundError when nothing was deleted', async () => {
    repo.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(service.remove('v1')).resolves.toBeUndefined();
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('list returns items with pagination metadata', async () => {
    repo.findMany.mockResolvedValue({ items: [camry], total: 25 });
    const result = await service.list({ ...baseQuery, page: 2, limit: 10 });
    expect(result.items).toEqual([camry]);
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
  });

  it('reports totalPages 0 for an empty result', async () => {
    repo.findMany.mockResolvedValue({ items: [], total: 0 });
    expect((await service.list(baseQuery)).meta.totalPages).toBe(0);
  });

  it('search forwards every filter to the repository', async () => {
    repo.findMany.mockResolvedValue({ items: [], total: 0 });
    const query: VehicleQuery = { ...baseQuery, make: 'toy', category: 'sedan', minPrice: 1, maxPrice: 9 };
    await service.search(query);
    expect(repo.findMany).toHaveBeenCalledWith(query);
  });

  it('getStats passes through the aggregate', async () => {
    const stats = { totalVehicles: 2, totalStock: 7, inStockVehicles: 2, outOfStockVehicles: 0, categories: [] };
    repo.getStats.mockResolvedValue(stats);
    expect(await service.getStats()).toBe(stats);
  });
});
