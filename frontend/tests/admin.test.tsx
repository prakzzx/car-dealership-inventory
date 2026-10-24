import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/api/endpoints';
import AdminPage from '../src/pages/AdminPage';
import VehicleFormPage from '../src/pages/VehicleFormPage';
import { adminUser, apiError, makeVehicle, paged } from './fixtures';
import { renderApp } from './utils';

vi.mock('../src/api/endpoints');

const camry = makeVehicle();
const soldOut = makeVehicle({ id: 'v-3', make: 'Chevrolet', model: 'Silverado', quantity: 0 });

const adminPages = (
  <Routes>
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/admin/vehicles/new" element={<VehicleFormPage />} />
    <Route path="/admin/vehicles/:id/edit" element={<VehicleFormPage />} />
  </Routes>
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listVehicles).mockResolvedValue(paged([camry, soldOut]));
});

describe('AdminPage', () => {
  it('lists every vehicle including sold-out ones', async () => {
    renderApp(adminPages, { route: '/admin', user: adminUser });
    expect(await screen.findByRole('row', { name: /Toyota Camry/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Chevrolet Silverado/ })).toHaveTextContent('0');
    expect(vi.mocked(api.listVehicles).mock.lastCall?.[0]).toMatchObject({ availability: 'all' });
  });

  it('asks for confirmation before deleting; Cancel does nothing', async () => {
    renderApp(adminPages, { route: '/admin', user: adminUser });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Toyota Camry' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete vehicle?' });
    expect(dialog).toHaveTextContent('Toyota Camry');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(api.deleteVehicle).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deletes after confirmation and reloads the list', async () => {
    vi.mocked(api.deleteVehicle).mockResolvedValue(undefined);
    renderApp(adminPages, { route: '/admin', user: adminUser });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Toyota Camry' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteVehicle).toHaveBeenCalledWith('v-1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Vehicle deleted');
    expect(vi.mocked(api.listVehicles).mock.calls.length).toBeGreaterThan(1);
  });

  it('restocks a vehicle with a validated quantity', async () => {
    vi.mocked(api.restockVehicle).mockResolvedValue({ ...soldOut, quantity: 10 });
    renderApp(adminPages, { route: '/admin', user: adminUser });
    await userEvent.click(await screen.findByRole('button', { name: 'Restock Chevrolet Silverado' }));
    const dialog = await screen.findByRole('dialog', { name: 'Restock Chevrolet Silverado' });
    const input = within(dialog).getByLabelText('Units to add');
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add stock' }));
    expect(await within(dialog).findByText('Enter a whole number of at least 1')).toBeInTheDocument();
    expect(api.restockVehicle).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, '10');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add stock' }));
    await waitFor(() => expect(api.restockVehicle).toHaveBeenCalledWith('v-3', 10));
  });
});

describe('VehicleFormPage (add)', () => {
  it('validates required fields and numbers with helpful messages', async () => {
    renderApp(adminPages, { route: '/admin/vehicles/new', user: adminUser });
    await userEvent.click(await screen.findByRole('button', { name: 'Save vehicle' }));
    expect(await screen.findByText('Make is required')).toBeInTheDocument();
    expect(screen.getByText('Model is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(screen.getByText('Price is required')).toBeInTheDocument();
    expect(screen.getByText('Quantity is required')).toBeInTheDocument();
    expect(api.createVehicle).not.toHaveBeenCalled();
  });

  it('rejects a negative price, fractional quantity and non-http image URL', async () => {
    renderApp(adminPages, { route: '/admin/vehicles/new', user: adminUser });
    await userEvent.type(await screen.findByLabelText('Price (USD)'), '-5');
    await userEvent.type(screen.getByLabelText('Quantity in stock'), '1.5');
    await userEvent.type(screen.getByLabelText('Image URL'), 'javascript:alert(1)');
    await userEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));
    expect(await screen.findByText('Price must be greater than 0')).toBeInTheDocument();
    expect(screen.getByText('Quantity must be a whole number of 0 or more')).toBeInTheDocument();
    expect(screen.getByText('Image URL must start with http:// or https://')).toBeInTheDocument();
  });

  it('submits numbers (not strings) to the API and returns to the admin list', async () => {
    vi.mocked(api.createVehicle).mockResolvedValue(makeVehicle({ id: 'new' }));
    renderApp(adminPages, { route: '/admin/vehicles/new', user: adminUser });
    await userEvent.type(await screen.findByLabelText('Make'), 'Kia');
    await userEvent.type(screen.getByLabelText('Model'), 'EV6');
    await userEvent.type(screen.getByLabelText('Category'), 'Electric');
    await userEvent.type(screen.getByLabelText('Price (USD)'), '42000.50');
    await userEvent.type(screen.getByLabelText('Quantity in stock'), '4');
    await userEvent.type(screen.getByLabelText('Year'), '2024');
    await userEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));
    await waitFor(() =>
      expect(api.createVehicle).toHaveBeenCalledWith({ make: 'Kia', model: 'EV6', category: 'Electric', price: 42000.5, quantity: 4, year: 2024, description: null, imageUrl: null }),
    );
    expect(await screen.findByRole('heading', { name: 'Manage inventory' })).toBeInTheDocument();
  });

  it('shows server-side validation errors', async () => {
    vi.mocked(api.createVehicle).mockRejectedValue(apiError(400, 'VALIDATION_ERROR', 'Validation failed'));
    renderApp(adminPages, { route: '/admin/vehicles/new', user: adminUser });
    await userEvent.type(await screen.findByLabelText('Make'), 'Kia');
    await userEvent.type(screen.getByLabelText('Model'), 'EV6');
    await userEvent.type(screen.getByLabelText('Category'), 'Electric');
    await userEvent.type(screen.getByLabelText('Price (USD)'), '42000');
    await userEvent.type(screen.getByLabelText('Quantity in stock'), '4');
    await userEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Validation failed');
  });
});

describe('VehicleFormPage (edit)', () => {
  it('loads the vehicle, pre-fills the form and saves changes', async () => {
    vi.mocked(api.getVehicle).mockResolvedValue(camry);
    vi.mocked(api.updateVehicle).mockResolvedValue({ ...camry, price: 30000 });
    renderApp(adminPages, { route: '/admin/vehicles/v-1/edit', user: adminUser });
    expect(await screen.findByRole('heading', { name: 'Edit vehicle' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Make')).toHaveValue('Toyota'));
    expect(screen.getByLabelText('Price (USD)')).toHaveValue('28995');
    const price = screen.getByLabelText('Price (USD)');
    await userEvent.clear(price);
    await userEvent.type(price, '30000');
    await userEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));
    await waitFor(() => expect(api.updateVehicle).toHaveBeenCalledWith('v-1', expect.objectContaining({ price: 30000, make: 'Toyota', quantity: 5 })));
  });

  it('shows an error when the vehicle does not exist', async () => {
    vi.mocked(api.getVehicle).mockRejectedValue(apiError(404, 'NOT_FOUND', 'Vehicle not found'));
    renderApp(adminPages, { route: '/admin/vehicles/gone/edit', user: adminUser });
    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle not found');
  });
});
