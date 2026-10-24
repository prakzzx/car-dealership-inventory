export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclePayload {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  items: T[];
  meta: PageMeta;
}

export interface VehicleStats {
  totalVehicles: number;
  totalStock: number;
  inStockVehicles: number;
  outOfStockVehicles: number;
  categories: { category: string; count: number; stock: number }[];
}

export interface PurchaseResult {
  vehicle: Vehicle;
  purchase: { id: string; vehicleId: string | null; userId: string; vehicleName: string; quantity: number; unitPrice: number; totalPrice: number; createdAt: string };
  message: string;
}

export type Availability = 'in_stock' | 'out_of_stock' | 'all';

export interface VehicleQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  availability?: Availability;
  make?: string;
  model?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  year?: number;
}

export interface AuthResult {
  user: User;
  token: string;
}
