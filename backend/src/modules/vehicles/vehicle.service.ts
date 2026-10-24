import type { Vehicle, VehicleInput, VehicleQuery, VehicleStats } from '../../domain/vehicle';
import { NotFoundError } from '../../errors/AppError';
import type { PaginationMeta } from '../../utils/response';
import type { VehicleRepository } from './vehicle.repository';

export interface PagedVehicles {
  items: Vehicle[];
  meta: PaginationMeta;
}

const notFound = () => new NotFoundError('Vehicle not found');

export class VehicleService {
  constructor(private readonly vehicles: VehicleRepository) {}

  create(input: VehicleInput): Promise<Vehicle> {
    return this.vehicles.create(input);
  }

  async getById(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findById(id);
    if (!vehicle) throw notFound();
    return vehicle;
  }

  async update(id: string, input: VehicleInput): Promise<Vehicle> {
    const vehicle = await this.vehicles.update(id, input);
    if (!vehicle) throw notFound();
    return vehicle;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.vehicles.delete(id))) throw notFound();
  }

  list(query: VehicleQuery): Promise<PagedVehicles> {
    return this.page(query);
  }

  search(query: VehicleQuery): Promise<PagedVehicles> {
    return this.page(query);
  }

  getStats(): Promise<VehicleStats> {
    return this.vehicles.getStats();
  }

  private async page(query: VehicleQuery): Promise<PagedVehicles> {
    const { items, total } = await this.vehicles.findMany(query);
    return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
}
