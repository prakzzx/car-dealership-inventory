export type Availability = 'in_stock' | 'out_of_stock' | 'all';
export const SORT_FIELDS = ['createdAt', 'price', 'make', 'model', 'category', 'year', 'quantity'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  /** Stored as DECIMAL(12,2) in PostgreSQL; exposed as a JS number (max 10 integer digits, so it is exact). */
  price: number;
  quantity: number;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleInput {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  year?: number | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface VehicleQuery {
  page: number;
  limit: number;
  sortBy: SortField;
  sortOrder: SortOrder;
  availability: Availability;
  make?: string;
  model?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  year?: number;
}

export interface CategoryStat {
  category: string;
  count: number;
  stock: number;
}

export interface VehicleStats {
  totalVehicles: number;
  totalStock: number;
  inStockVehicles: number;
  outOfStockVehicles: number;
  categories: CategoryStat[];
}
