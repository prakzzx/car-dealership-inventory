import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createVehicleSchema, listQuerySchema, searchQuerySchema, updateVehicleSchema, vehicleIdSchema } from './vehicle.schemas';
import type { VehicleService } from './vehicle.service';

export class VehicleController {
  constructor(private readonly service: VehicleService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.create(createVehicleSchema.parse(req.body)), { status: 201 });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await this.service.list(listQuerySchema.parse(req.query));
    sendSuccess(res, items, { meta });
  };

  search = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await this.service.search(searchQuerySchema.parse(req.query));
    sendSuccess(res, items, { meta });
  };

  stats = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getStats());
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getById(vehicleIdSchema.parse(req.params.id)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = vehicleIdSchema.parse(req.params.id);
    sendSuccess(res, await this.service.update(id, updateVehicleSchema.parse(req.body)));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(vehicleIdSchema.parse(req.params.id));
    res.status(204).send();
  };
}
