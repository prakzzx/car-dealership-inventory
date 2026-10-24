import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});

describe('role-aware navigation', () => {
  it('shows branding, the user name and NO admin link to a customer', async () => {
    renderApp(<App />, { user: customerUser });
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(screen.getByText('AutoHub')).toBeInTheDocument();
    expect(screen.getByText('Casey Customer')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Manage inventory' })).not.toBeInTheDocument();
    expect(nav).toBeInTheDocument();
  });

  it('shows the admin link to an admin', async () => {
    renderApp(<App />, { user: adminUser });
    expect(await screen.findByRole('link', { name: 'Manage inventory' })).toHaveAttribute('href', '/admin');
  });

  it('logout clears the token and returns to the login page', async () => {
    renderApp(<App />, { user: customerUser });
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in to AutoHub' })).toBeInTheDocument();
    expect(localStorage.getItem('autohub.token')).toBeNull();
  });
});
