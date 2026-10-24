import type { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';
import type { InventoryController } from './inventory.controller';

/** Adds inventory actions onto the (already authenticated) /api/vehicles router. */
export function registerInventoryRoutes(router: Router, controller: InventoryController): void {
  router.post('/:id/purchase', asyncHandler(controller.purchase)); // any authenticated user
  router.post('/:id/restock', requireRole('ADMIN'), asyncHandler(controller.restock));
}
