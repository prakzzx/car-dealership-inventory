import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/AppError';
import { sendSuccess } from '../../utils/response';
import { vehicleIdSchema } from '../vehicles/vehicle.schemas';
import { purchaseSchema, restockSchema } from './inventory.schemas';
import type { InventoryService } from './inventory.service';

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  purchase = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const id = vehicleIdSchema.parse(req.params.id);
    const { quantity } = purchaseSchema.parse(req.body ?? {});
    sendSuccess(res, await this.service.purchase(req.user.id, id, quantity), { status: 201 });
  };

  restock = async (req: Request, res: Response): Promise<void> => {
    const id = vehicleIdSchema.parse(req.params.id);
    const { quantity } = restockSchema.parse(req.body ?? {});
    sendSuccess(res, await this.service.restock(id, quantity));
  };
}
