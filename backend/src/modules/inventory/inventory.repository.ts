import { Prisma, type PrismaClient } from '@prisma/client';
import type { PurchaseOutcome, PurchaseRequest } from '../../domain/inventory';
import type { Vehicle } from '../../domain/vehicle';
import { toVehicle } from '../vehicles/vehicle.repository';

export interface InventoryRepository {
  purchase(request: PurchaseRequest): Promise<PurchaseOutcome>;
  /** Resolves null when the vehicle does not exist. */
  restock(vehicleId: string, quantity: number): Promise<Vehicle | null>;
}

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async purchase({ vehicleId, userId, quantity }: PurchaseRequest): Promise<PurchaseOutcome> {
    return this.prisma.$transaction(async (tx) => {
      // ATOMIC CONDITIONAL UPDATE: "UPDATE ... SET quantity = quantity - n WHERE id = ? AND quantity >= n".
      // The check and the decrement are one SQL statement, so PostgreSQL's row lock serialises concurrent buyers:
      // a second buyer waits, re-evaluates the WHERE against the new quantity, and matches 0 rows if stock ran out.
      // We deliberately do NOT read the quantity first and write later (that would race and oversell).
      const { count } = await tx.vehicle.updateMany({
        where: { id: vehicleId, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });

      if (count === 0) {
        // Only now do we read, purely to tell "does not exist" apart from "not enough stock" for the error message.
        const existing = await tx.vehicle.findUnique({ where: { id: vehicleId }, select: { quantity: true } });
        return existing ? { kind: 'insufficient_stock', available: existing.quantity } : { kind: 'not_found' };
      }

      const row = await tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
      const purchase = await tx.purchase.create({
        data: {
          vehicleId,
          userId,
          vehicleName: `${row.make} ${row.model}`,
          quantity,
          unitPrice: row.price,
          totalPrice: row.price.mul(quantity),
        },
      });
      return {
        kind: 'success',
        vehicle: toVehicle(row),
        purchase: {
          id: purchase.id,
          vehicleId: purchase.vehicleId,
          userId: purchase.userId,
          vehicleName: purchase.vehicleName,
          quantity: purchase.quantity,
          unitPrice: purchase.unitPrice.toNumber(),
          totalPrice: purchase.totalPrice.toNumber(),
          createdAt: purchase.createdAt,
        },
      } satisfies PurchaseOutcome;
    });
  }

  async restock(vehicleId: string, quantity: number): Promise<Vehicle | null> {
    try {
      // `increment` is applied by the database (quantity = quantity + n), so concurrent restocks cannot lose updates.
      return toVehicle(await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { quantity: { increment: quantity } } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return null;
      throw error;
    }
  }
}
