import type { PurchaseRecord } from '../../domain/inventory';
import type { Vehicle } from '../../domain/vehicle';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError';
import type { InventoryRepository } from './inventory.repository';

export interface PurchaseConfirmation {
  vehicle: Vehicle;
  purchase: PurchaseRecord;
  message: string;
}

const assertPositiveInteger = (quantity: number): void => {
  // The HTTP layer validates too, but the service enforces its own invariant so it is safe to call from anywhere.
  if (!Number.isInteger(quantity) || quantity < 1) throw new ValidationError('Quantity must be a whole number of at least 1');
};

export class InventoryService {
  constructor(private readonly inventory: InventoryRepository) {}

  async purchase(userId: string, vehicleId: string, quantity: number): Promise<PurchaseConfirmation> {
    assertPositiveInteger(quantity);
    const outcome = await this.inventory.purchase({ vehicleId, userId, quantity });

    switch (outcome.kind) {
      case 'not_found':
        throw new NotFoundError('Vehicle not found');
      case 'insufficient_stock':
        throw new ConflictError(
          outcome.available === 0 ? 'This vehicle is out of stock' : `Only ${outcome.available} unit(s) available`,
          'INSUFFICIENT_STOCK',
          { available: outcome.available, requested: quantity },
        );
      case 'success':
        return {
          vehicle: outcome.vehicle,
          purchase: outcome.purchase,
          message: `Purchase confirmed: ${quantity} x ${outcome.purchase.vehicleName}`,
        };
    }
  }

  async restock(vehicleId: string, quantity: number): Promise<Vehicle> {
    assertPositiveInteger(quantity);
    const vehicle = await this.inventory.restock(vehicleId, quantity);
    if (!vehicle) throw new NotFoundError('Vehicle not found');
    return vehicle;
  }
}
