import type { VehicleQueryParams } from '../types';

export interface FilterState {
  make: string;
  model: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  /** "<field>:<order>", e.g. "price:asc". */
  sort: string;
  includeSoldOut: boolean;
}

export const DEFAULT_FILTERS: FilterState = { make: '', model: '', category: '', minPrice: '', maxPrice: '', sort: 'createdAt:desc', includeSoldOut: false };

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'price:asc', label: 'Price: low to high' },
  { value: 'price:desc', label: 'Price: high to low' },
  { value: 'make:asc', label: 'Make: A to Z' },
] as const;

export const PAGE_SIZE = 12;

/** Blank fields are omitted entirely so the API only receives filters the person actually set. */
export function buildSearchParams(filters: FilterState, page: number): VehicleQueryParams {
  const [sortBy, sortOrder] = filters.sort.split(':') as [string, 'asc' | 'desc'];
  const params: VehicleQueryParams = { page, limit: PAGE_SIZE, sortBy, sortOrder, availability: filters.includeSoldOut ? 'all' : 'in_stock' };
  if (filters.make.trim()) params.make = filters.make.trim();
  if (filters.model.trim()) params.model = filters.model.trim();
  if (filters.category) params.category = filters.category;
  if (filters.minPrice.trim()) params.minPrice = Number(filters.minPrice);
  if (filters.maxPrice.trim()) params.maxPrice = Number(filters.maxPrice);
  return params;
}

export function validatePriceRange(filters: FilterState): string | null {
  const min = filters.minPrice.trim() === '' ? undefined : Number(filters.minPrice);
  const max = filters.maxPrice.trim() === '' ? undefined : Number(filters.maxPrice);
  if ((min !== undefined && (Number.isNaN(min) || min < 0)) || (max !== undefined && (Number.isNaN(max) || max < 0))) return 'Prices must be numbers of 0 or more';
  if (min !== undefined && max !== undefined && min > max) return 'Min price cannot be greater than max price';
  return null;
}
