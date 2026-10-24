import type { Vehicle } from './vehicle';

export interface PurchaseRecord {
  id: string;
  vehicleId: string | null;
  userId: string;
  /** Snapshot of "Make Model" so the record stays meaningful if the vehicle is later deleted. */
  vehicleName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
}

export interface PurchaseRequest {
  vehicleId: string;
  userId: string;
  quantity: number;
}

export type PurchaseOutcome =
  | { kind: 'success'; vehicle: Vehicle; purchase: PurchaseRecord }
  | { kind: 'not_found' }
  | { kind: 'insufficient_stock'; available: number };
