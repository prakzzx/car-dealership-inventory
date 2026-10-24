import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/api/endpoints';
import DashboardPage from '../src/pages/DashboardPage';
import { adminUser, apiError, customerUser, makeVehicle, paged, stats } from './fixtures';
import { renderApp } from './utils';

vi.mock('../src/api/endpoints');

const camry = makeVehicle();
const rav4 = makeVehicle({ id: 'v-2', make: 'Toyota', model: 'RAV4', category: 'SUV', price: 33450, quantity: 3 });
const soldOut = makeVehicle({ id: 'v-3', make: 'Chevrolet', model: 'Silverado', category: 'Truck', quantity: 0 });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchStats).mockResolvedValue(stats);
  vi.mocked(api.searchVehicles).mockResolvedValue(paged([camry, rav4, soldOut]));
});

const lastSearch = () => vi.mocked(api.searchVehicles).mock.lastCall?.[0];

describe('DashboardPage - rendering', () => {
  it('renders summary cards from the stats API (no hard-coded numbers)', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    expect(within(await screen.findByRole('group', { name: 'Total vehicles' })).getByText('12')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Vehicles in stock' })).getByText('11')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Units in stock' })).getByText('45')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Categories' })).getByText('2')).toBeInTheDocument();
  });

  it('renders a card per vehicle returned by the search API', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    expect(await screen.findByRole('article', { name: 'Toyota Camry' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Toyota RAV4' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Chevrolet Silverado' })).toHaveTextContent('Sold out');
    expect(lastSearch()).toMatchObject({ page: 1, availability: 'in_stock' });
  });

  it('shows loading skeletons while the request is pending', async () => {
    vi.mocked(api.searchVehicles).mockReturnValue(new Promise(() => undefined));
    renderApp(<DashboardPage />, { user: customerUser });
    expect((await screen.findAllByTestId('vehicle-skeleton')).length).toBeGreaterThan(0);
    expect(screen.getByRole('list', { name: 'Vehicles' })).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an error with a working retry button', async () => {
    vi.mocked(api.searchVehicles).mockRejectedValueOnce(apiError(500, 'INTERNAL_ERROR', 'Internal server error'));
    renderApp(<DashboardPage />, { user: customerUser });
    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('article', { name: 'Toyota Camry' })).toBeInTheDocument();
  });

  it('shows an empty state and lets the user clear filters', async () => {
    vi.mocked(api.searchVehicles).mockResolvedValueOnce(paged([]));
    renderApp(<DashboardPage />, { user: customerUser });
    expect(await screen.findByRole('heading', { name: 'No vehicles found' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByRole('article', { name: 'Toyota Camry' })).toBeInTheDocument();
  });

  it('hides admin controls from customers and shows them to admins', async () => {
    const { unmount } = renderApp(<DashboardPage />, { user: customerUser });
    await screen.findByRole('article', { name: 'Toyota Camry' });
    expect(screen.queryByRole('link', { name: 'Edit Toyota Camry' })).not.toBeInTheDocument();
    unmount();
    renderApp(<DashboardPage />, { user: adminUser });
    expect(await screen.findByRole('link', { name: 'Edit Toyota Camry' })).toBeInTheDocument();
  });
});

describe('DashboardPage - search, filter, sort, pagination', () => {
  it('searches by make and model on submit', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    await screen.findByRole('article', { name: 'Toyota Camry' });
    await userEvent.type(screen.getByLabelText('Search make'), 'toy');
    await userEvent.type(screen.getByLabelText('Model'), 'cam');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(lastSearch()).toMatchObject({ make: 'toy', model: 'cam', page: 1 }));
  });

  it('offers categories from the stats API and filters immediately when one is chosen', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    await screen.findByRole('article', { name: 'Toyota Camry' });
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'SUV');
    await waitFor(() => expect(lastSearch()).toMatchObject({ category: 'SUV' }));
  });

  it('applies a price range', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    await screen.findByRole('article', { name: 'Toyota Camry' });
    await userEvent.type(screen.getByLabelText('Min price'), '20000');
    await userEvent.type(screen.getByLabelText('Max price'), '35000');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(lastSearch()).toMatchObject({ minPrice: 20000, maxPrice: 35000 }));
  });

  it('rejects an inverted price range before calling the API', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    await screen.findByRole('article', { name: 'Toyota Camry' });
    const callsBefore = vi.mocked(api.searchVehicles).mock.calls.length;
    await userEvent.type(screen.getByLabelText('Min price'), '50000');
    await userEvent.type(screen.getByLabelText('Max price'), '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Min price cannot be greater than max price')).toBeInTheDocument();
    expect(vi.mocked(api.searchVehicles).mock.calls.length).toBe(callsBefore);
  });

  it('sorts and can include sold-out vehicles', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    await screen.findByRole('article', { name: 'Toyota Camry' });
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'price:asc');
    await waitFor(() => expect(lastSearch()).toMatchObject({ sortBy: 'price', sortOrder: 'asc' }));
    await userEvent.click(screen.getByLabelText('Include sold out'));
    await waitFor(() => expect(lastSearch()).toMatchObject({ availability: 'all' }));
  });

  it('pages through results', async () => {
    vi.mocked(api.searchVehicles).mockResolvedValue(paged([camry], { page: 1, total: 30, totalPages: 3 }));
    renderApp(<DashboardPage />, { user: customerUser });
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastSearch()).toMatchObject({ page: 2 }));
  });

  it('Reset restores defaults', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    await screen.findByRole('article', { name: 'Toyota Camry' });
    await userEvent.type(screen.getByLabelText('Search make'), 'ford');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(lastSearch()).toMatchObject({ make: 'ford' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(lastSearch()?.make).toBeUndefined());
    expect(screen.getByLabelText('Search make')).toHaveValue('');
  });
});

describe('DashboardPage - purchasing', () => {
  it('purchases, shows the confirmation and refreshes stock in the UI', async () => {
    vi.mocked(api.purchaseVehicle).mockResolvedValue({
      vehicle: { ...camry, quantity: 3 },
      purchase: { id: 'p1', vehicleId: 'v-1', userId: 'u', vehicleName: 'Toyota Camry', quantity: 2, unitPrice: 28995, totalPrice: 57990, createdAt: '2026-01-01T00:00:00Z' },
      message: 'Purchase confirmed: 2 x Toyota Camry',
    });
    renderApp(<DashboardPage />, { user: customerUser });
    const card = await screen.findByRole('article', { name: 'Toyota Camry' });
    const qty = within(card).getByLabelText('Quantity for Toyota Camry');
    await userEvent.clear(qty);
    await userEvent.type(qty, '2');
    await userEvent.click(within(card).getByRole('button', { name: 'Purchase Toyota Camry' }));
    expect(api.purchaseVehicle).toHaveBeenCalledWith('v-1', 2);
    expect(await screen.findByRole('status')).toHaveTextContent('Purchase confirmed: 2 x Toyota Camry');
    await waitFor(() => expect(screen.getByRole('article', { name: 'Toyota Camry' })).toHaveTextContent('3 in stock'));
    expect(vi.mocked(api.fetchStats).mock.calls.length).toBeGreaterThan(1); // summary cards re-fetched
  });

  it('handles insufficient stock (concurrent change): shows the message and reloads the list', async () => {
    vi.mocked(api.purchaseVehicle).mockRejectedValue(apiError(409, 'INSUFFICIENT_STOCK', 'Only 1 unit(s) available', { available: 1, requested: 2 }));
    renderApp(<DashboardPage />, { user: customerUser });
    const card = await screen.findByRole('article', { name: 'Toyota Camry' });
    const searchCalls = vi.mocked(api.searchVehicles).mock.calls.length;
    await userEvent.click(within(card).getByRole('button', { name: 'Purchase Toyota Camry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only 1 unit(s) available');
    await waitFor(() => expect(vi.mocked(api.searchVehicles).mock.calls.length).toBeGreaterThan(searchCalls));
  });
});

describe('DashboardPage - details dialog', () => {
  it('opens the vehicle details and closes with Escape, restoring focus', async () => {
    renderApp(<DashboardPage />, { user: customerUser });
    const opener = await screen.findByRole('button', { name: 'View details for Toyota Camry' });
    await userEvent.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Toyota Camry' });
    expect(dialog).toHaveTextContent('Comfortable midsize sedan.');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
