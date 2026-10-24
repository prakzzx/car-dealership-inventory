import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vehicle } from '../../src/domain/vehicle';
import type { PurchaseRecord } from '../../src/domain/inventory';
import { ConflictError, NotFoundError, ValidationError } from '../../src/errors/AppError';
import type { InventoryRepository } from '../../src/modules/inventory/inventory.repository';
import { InventoryService } from '../../src/modules/inventory/inventory.service';

const now = new Date('2026-01-01T00:00:00Z');
const vehicle: Vehicle = { id: 'v1', make: 'Toyota', model: 'Camry', category: 'Sedan', price: 100, quantity: 2, year: 2024, description: null, imageUrl: null, createdAt: now, updatedAt: now };
const purchase: PurchaseRecord = { id: 'p1', vehicleId: 'v1', userId: 'u1', vehicleName: 'Toyota Camry', quantity: 3, unitPrice: 100, totalPrice: 300, createdAt: now };

let repo: { purchase: ReturnType<typeof vi.fn>; restock: ReturnType<typeof vi.fn> };
let service: InventoryService;

beforeEach(() => {
  repo = { purchase: vi.fn(), restock: vi.fn() };
  service = new InventoryService(repo as unknown as InventoryRepository);
});

describe('InventoryService.purchase', () => {
  it('returns the updated vehicle, the purchase and a confirmation message', async () => {
    repo.purchase.mockResolvedValue({ kind: 'success', vehicle, purchase });
    const result = await service.purchase('u1', 'v1', 3);
    expect(repo.purchase).toHaveBeenCalledWith({ vehicleId: 'v1', userId: 'u1', quantity: 3 });
    expect(result.vehicle).toBe(vehicle);
    expect(result.purchase).toBe(purchase);
    expect(result.message).toMatch(/3 x Toyota Camry/);
  });

  it('maps not_found to NotFoundError', async () => {
    repo.purchase.mockResolvedValue({ kind: 'not_found' });
    await expect(service.purchase('u1', 'v1', 1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps insufficient_stock to ConflictError carrying the available quantity', async () => {
    repo.purchase.mockResolvedValue({ kind: 'insufficient_stock', available: 2 });
    const error = await service.purchase('u1', 'v1', 5).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).code).toBe('INSUFFICIENT_STOCK');
    expect((error as ConflictError).details).toEqual({ available: 2, requested: 5 });
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects quantity %s before touching the repository', async (quantity) => {
    await expect(service.purchase('u1', 'v1', quantity)).rejects.toBeInstanceOf(ValidationError);
    expect(repo.purchase).not.toHaveBeenCalled();
  });
});

describe('InventoryService.restock', () => {
  it('returns the updated vehicle', async () => {
    repo.restock.mockResolvedValue({ ...vehicle, quantity: 12 });
    expect((await service.restock('v1', 10)).quantity).toBe(12);
    expect(repo.restock).toHaveBeenCalledWith('v1', 10);
  });

  it('throws NotFoundError when the vehicle is missing', async () => {
    repo.restock.mockResolvedValue(null);
    await expect(service.restock('v1', 10)).rejects.toBeInstanceOf(NotFoundError);
  });

  it.each([0, -3, 2.5])('rejects quantity %s', async (quantity) => {
    await expect(service.restock('v1', quantity)).rejects.toBeInstanceOf(ValidationError);
    expect(repo.restock).not.toHaveBeenCalled();
  });
});
