import { api } from './client';
import type { AuthResult, PagedResult, PurchaseResult, User, Vehicle, VehiclePayload, VehicleQueryParams, VehicleStats } from '../types';

/** The API wraps everything as { success, data, meta? }; these helpers hand the UI plain data. */
export async function login(email: string, password: string): Promise<AuthResult> {
  return (await api.post('/auth/login', { email, password })).data.data;
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  return (await api.post('/auth/register', { name, email, password })).data.data;
}

export async function fetchMe(): Promise<User> {
  return (await api.get('/auth/me')).data.data.user;
}

export async function fetchStats(): Promise<VehicleStats> {
  return (await api.get('/vehicles/stats')).data.data;
}

export async function searchVehicles(params: VehicleQueryParams): Promise<PagedResult<Vehicle>> {
  const { data } = await api.get('/vehicles/search', { params });
  return { items: data.data, meta: data.meta };
}

export async function listVehicles(params: VehicleQueryParams): Promise<PagedResult<Vehicle>> {
  const { data } = await api.get('/vehicles', { params });
  return { items: data.data, meta: data.meta };
}

export async function getVehicle(id: string): Promise<Vehicle> {
  return (await api.get(`/vehicles/${id}`)).data.data;
}

export async function createVehicle(payload: VehiclePayload): Promise<Vehicle> {
  return (await api.post('/vehicles', payload)).data.data;
}

export async function updateVehicle(id: string, payload: VehiclePayload): Promise<Vehicle> {
  return (await api.put(`/vehicles/${id}`, payload)).data.data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await api.delete(`/vehicles/${id}`);
}

export async function purchaseVehicle(id: string, quantity: number): Promise<PurchaseResult> {
  return (await api.post(`/vehicles/${id}/purchase`, { quantity })).data.data;
}

export async function restockVehicle(id: string, quantity: number): Promise<Vehicle> {
  return (await api.post(`/vehicles/${id}/restock`, { quantity })).data.data;
}
