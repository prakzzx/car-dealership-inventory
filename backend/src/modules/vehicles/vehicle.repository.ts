import { Prisma, type PrismaClient, type Vehicle as VehicleRow } from '@prisma/client';
import type { Vehicle, VehicleInput, VehicleQuery, VehicleStats } from '../../domain/vehicle';

export interface VehicleRepository {
  create(input: VehicleInput): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  /** Resolves null when the vehicle does not exist. */
  update(id: string, input: VehicleInput): Promise<Vehicle | null>;
  /** Resolves false when the vehicle does not exist. */
  delete(id: string): Promise<boolean>;
  findMany(query: VehicleQuery): Promise<{ items: Vehicle[]; total: number }>;
  getStats(): Promise<VehicleStats>;
}

export function toVehicle(row: VehicleRow): Vehicle {
  return { ...row, price: row.price.toNumber() };
}

export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: VehicleInput): Promise<Vehicle> {
    return toVehicle(await this.prisma.vehicle.create({ data: input }));
  }

  async findById(id: string): Promise<Vehicle | null> {
    const row = await this.prisma.vehicle.findUnique({ where: { id } });
    return row ? toVehicle(row) : null;
  }

  async update(id: string, input: VehicleInput): Promise<Vehicle | null> {
    try {
      return toVehicle(await this.prisma.vehicle.update({ where: { id }, data: input }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return null;
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.vehicle.deleteMany({ where: { id } });
    return count > 0;
  }

  async findMany(query: VehicleQuery): Promise<{ items: Vehicle[]; total: number }> {
    const where = this.buildWhere(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        // `id` as a tie-breaker keeps pagination stable when many rows share the same sort value.
        orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { items: rows.map(toVehicle), total };
  }

  async getStats(): Promise<VehicleStats> {
    const [totals, inStock, groups] = await Promise.all([
      this.prisma.vehicle.aggregate({ _count: { _all: true }, _sum: { quantity: true } }),
      this.prisma.vehicle.count({ where: { quantity: { gt: 0 } } }),
      this.prisma.vehicle.groupBy({ by: ['category'], _count: { _all: true }, _sum: { quantity: true } }),
    ]);
    const totalVehicles = totals._count._all;
    return {
      totalVehicles,
      totalStock: totals._sum.quantity ?? 0,
      inStockVehicles: inStock,
      outOfStockVehicles: totalVehicles - inStock,
      // Sorted in JS (code-unit order) so the result does not depend on the database collation.
      categories: groups
        .map((g) => ({ category: g.category, count: g._count._all, stock: g._sum.quantity ?? 0 }))
        .sort((a, b) => (a.category < b.category ? -1 : a.category > b.category ? 1 : 0)),
    };
  }

  private buildWhere(query: VehicleQuery): Prisma.VehicleWhereInput {
    // Prisma passes `contains` straight into LIKE/ILIKE, so user-typed % and _ would act as wildcards.
    // Backslash is PostgreSQL's default LIKE escape character.
    const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
    const contains = (value: string) => ({ contains: escapeLike(value), mode: 'insensitive' as const });
    const where: Prisma.VehicleWhereInput = {};
    if (query.make) where.make = contains(query.make);
    if (query.model) where.model = contains(query.model);
    if (query.category) where.category = contains(query.category);
    if (query.year !== undefined) where.year = query.year;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = { gte: query.minPrice, lte: query.maxPrice };
    }
    if (query.availability === 'in_stock') where.quantity = { gt: 0 };
    if (query.availability === 'out_of_stock') where.quantity = 0;
    return where;
  }
}
