import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/api/endpoints';
import App from '../src/App';
import { adminUser, customerUser, makeVehicle, paged, seedCart, stats } from './fixtures';
import { renderApp } from './utils';

vi.mock('../src/api/endpoints');

const camry = makeVehicle(); // $28,995, 5 in stock
const rav4 = makeVehicle({ id: 'v-2', make: 'Toyota', model: 'RAV4', category: 'SUV', price: 33450, quantity: 3, year: 2023 });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchStats).mockResolvedValue(stats);
  vi.mocked(api.searchVehicles).mockResolvedValue(paged([camry, rav4]));
});

describe('adding to the cart from the inventory', () => {
  it('Purchase puts the car in the cart and the header cart badge counts the units', async () => {
    renderApp(<App />, { route: '/', user: customerUser });
    const card = await screen.findByRole('article', { name: 'Toyota Camry' });
    const qty = within(card).getByLabelText('Quantity for Toyota Camry');
    await userEvent.clear(qty);
    await userEvent.type(qty, '2');
    await userEvent.click(within(card).getByRole('button', { name: 'Purchase Toyota Camry' }));
    expect(await screen.findByRole('link', { name: 'Cart, 2 items' })).toHaveAttribute('href', '/cart');
  });

  it('the header link has no count when the cart is empty', async () => {
    renderApp(<App />, { route: '/', user: customerUser });
    expect(await screen.findByRole('link', { name: 'Cart' })).toBeInTheDocument();
  });

  it('opening the cart shows the details of the car that was added', async () => {
    renderApp(<App />, { route: '/', user: customerUser });
    const card = await screen.findByRole('article', { name: 'Toyota RAV4' });
    await userEvent.click(within(card).getByRole('button', { name: 'Purchase Toyota RAV4' }));
    await userEvent.click(await screen.findByRole('link', { name: 'Cart, 1 item' }));
    expect(await screen.findByRole('heading', { name: 'Your cart' })).toBeInTheDocument();
    const item = screen.getByRole('article', { name: 'Toyota RAV4' });
    expect(item).toHaveTextContent('SUV');
    expect(item).toHaveTextContent('2023');
    expect(item).toHaveTextContent('$33,450');
  });
});

describe('Cart page', () => {
  it('lists every item with unit price, quantity, line total and the order total', async () => {
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 2 }, { vehicle: rav4, quantity: 1 }]);
    renderApp(<App />, { route: '/cart', user: customerUser });
    const item = await screen.findByRole('article', { name: 'Toyota Camry' });
    expect(item).toHaveTextContent('$28,995');
    expect(within(item).getByLabelText('Cart quantity for Toyota Camry')).toHaveValue(2);
    expect(item).toHaveTextContent('$57,990');
    // 57,990 + 33,450
    expect(within(screen.getByRole('group', { name: 'Order total' })).getByText('$91,440')).toBeInTheDocument();
  });

  it('"Pay bill" goes to the Payment page', async () => {
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 1 }]);
    renderApp(<App />, { route: '/cart', user: customerUser });
    await userEvent.click(await screen.findByRole('button', { name: 'Pay bill' }));
    expect(await screen.findByRole('heading', { name: 'Payment' })).toBeInTheDocument();
  });

  it('can change quantity within the stock that was available, and remove items', async () => {
    seedCart(customerUser.id, [{ vehicle: rav4, quantity: 2 }]); // 3 in stock
    renderApp(<App />, { route: '/cart', user: customerUser });
    const item = await screen.findByRole('article', { name: 'Toyota RAV4' });
    await userEvent.click(within(item).getByRole('button', { name: 'Increase quantity of Toyota RAV4' }));
    await waitFor(() => expect(within(item).getByLabelText('Cart quantity for Toyota RAV4')).toHaveValue(3));
    expect(within(item).getByRole('button', { name: 'Increase quantity of Toyota RAV4' })).toBeDisabled(); // cannot exceed stock
    await userEvent.click(within(item).getByRole('button', { name: 'Decrease quantity of Toyota RAV4' }));
    await waitFor(() => expect(within(item).getByLabelText('Cart quantity for Toyota RAV4')).toHaveValue(2));
    await userEvent.click(within(item).getByRole('button', { name: 'Remove Toyota RAV4 from cart' }));
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });

  it('shows a friendly empty state and disables paying when there is nothing to pay', async () => {
    renderApp(<App />, { route: '/cart', user: customerUser });
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay bill' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse inventory' })).toHaveAttribute('href', '/');
  });

  it('keeps a separate cart per user', async () => {
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 1 }]);
    renderApp(<App />, { route: '/cart', user: adminUser });
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });

  it('survives a page reload (restored from storage)', async () => {
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 3 }]);
    renderApp(<App />, { route: '/', user: customerUser });
    expect(await screen.findByRole('link', { name: 'Cart, 3 items' })).toBeInTheDocument();
  });
});
