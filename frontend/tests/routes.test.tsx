import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/api/endpoints';
import App from '../src/App';
import { adminUser, customerUser, makeVehicle, paged, stats } from './fixtures';
import { renderApp } from './utils';

vi.mock('../src/api/endpoints');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchStats).mockResolvedValue(stats);
  vi.mocked(api.searchVehicles).mockResolvedValue(paged([makeVehicle()]));
  vi.mocked(api.listVehicles).mockResolvedValue(paged([makeVehicle()]));
});

describe('route protection', () => {
  it('redirects an anonymous visitor to the login page', async () => {
    renderApp(<App />, { route: '/' });
    expect(await screen.findByRole('heading', { name: 'Sign in to AutoHub' })).toBeInTheDocument();
    expect(api.searchVehicles).not.toHaveBeenCalled();
  });

  it('redirects an anonymous visitor away from admin pages too', async () => {
    renderApp(<App />, { route: '/admin' });
    expect(await screen.findByRole('heading', { name: 'Sign in to AutoHub' })).toBeInTheDocument();
  });

  it.each(['/cart', '/payment'])('redirects an anonymous visitor away from %s', async (route) => {
    renderApp(<App />, { route });
    expect(await screen.findByRole('heading', { name: 'Sign in to AutoHub' })).toBeInTheDocument();
  });

  it('lets a customer see the inventory', async () => {
    renderApp(<App />, { route: '/', user: customerUser });
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
  });

  it('bounces a customer away from /admin (route guard, not just hidden links)', async () => {
    renderApp(<App />, { route: '/admin', user: customerUser });
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Manage inventory' })).not.toBeInTheDocument();
    expect(api.listVehicles).not.toHaveBeenCalled();
  });

  it('bounces a customer away from the add-vehicle form', async () => {
    renderApp(<App />, { route: '/admin/vehicles/new', user: customerUser });
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Add vehicle' })).not.toBeInTheDocument();
  });

  it('lets an admin open /admin', async () => {
    renderApp(<App />, { route: '/admin', user: adminUser });
    expect(await screen.findByRole('heading', { name: 'Manage inventory' })).toBeInTheDocument();
  });

  it('shows a 404 page for unknown URLs', async () => {
    renderApp(<App />, { route: '/definitely/not/here', user: customerUser });
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('logs out a user whose stored token the server rejects', async () => {
    localStorage.setItem('autohub.token', 'stale');
    vi.mocked(api.fetchMe).mockRejectedValue(new Error('401'));
    renderApp(<App />, { route: '/' });
    expect(await screen.findByRole('heading', { name: 'Sign in to AutoHub' })).toBeInTheDocument();
    expect(localStorage.getItem('autohub.token')).toBeNull();
  });
});
