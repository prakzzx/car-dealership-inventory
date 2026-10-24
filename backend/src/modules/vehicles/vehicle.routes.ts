import { Router, type RequestHandler } from 'express';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';
import type { VehicleController } from './vehicle.controller';

export function createVehicleRouter(controller: VehicleController, authenticate: RequestHandler, extra?: (router: Router) => void): Router {
  const router = Router();
  router.use(authenticate); // every vehicle route requires a valid JWT
  const adminOnly = requireRole('ADMIN');

  router.get('/', asyncHandler(controller.list));
  // Fixed-path routes MUST be registered before '/:id' or Express would treat "search"/"stats" as an id.
  router.get('/search', asyncHandler(controller.search));
  router.get('/stats', asyncHandler(controller.stats));
  extra?.(router);
  router.post('/', adminOnly, asyncHandler(controller.create));
  router.get('/:id', asyncHandler(controller.getById));
  router.put('/:id', adminOnly, asyncHandler(controller.update));
  router.delete('/:id', adminOnly, asyncHandler(controller.remove));
  return router;
}
