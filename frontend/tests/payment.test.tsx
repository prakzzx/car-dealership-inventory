import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/api/endpoints';
import App from '../src/App';
import { apiError, customerUser, makeVehicle, paged, seedCart, stats } from './fixtures';
import { renderApp } from './utils';

vi.mock('../src/api/endpoints');

const camry = makeVehicle();
const rav4 = makeVehicle({ id: 'v-2', make: 'Toyota', model: 'RAV4', category: 'SUV', price: 33450, quantity: 3 });

const confirmation = (vehicle: typeof camry, quantity: number) => ({
  vehicle: { ...vehicle, quantity: vehicle.quantity - quantity },
  purchase: { id: `p-${vehicle.id}`, vehicleId: vehicle.id, userId: 'u', vehicleName: `${vehicle.make} ${vehicle.model}`, quantity, unitPrice: vehicle.price, totalPrice: vehicle.price * quantity, createdAt: '2026-01-01T00:00:00Z' },
  message: `Purchase confirmed: ${quantity} x ${vehicle.make} ${vehicle.model}`,
});

async function fillCard({ name = 'Casey Customer', number = '4242 4242 4242 4242', expiry = '12/99', cvc = '123' } = {}) {
  if (name) await userEvent.type(screen.getByLabelText('Cardholder name'), name);
  if (number) await userEvent.type(screen.getByLabelText('Card number'), number);
  if (expiry) await userEvent.type(screen.getByLabelText('Expiry (MM/YY)'), expiry);
  if (cvc) await userEvent.type(screen.getByLabelText('CVC'), cvc);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchStats).mockResolvedValue(stats);
  vi.mocked(api.searchVehicles).mockResolvedValue(paged([camry, rav4]));
});

describe('Payment page', () => {
  it('summarises the order and clearly says it is a demo payment', async () => {
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 2 }]);
    renderApp(<App />, { route: '/payment', user: customerUser });
    expect(await screen.findByRole('heading', { name: 'Payment' })).toBeInTheDocument();
    const summary = screen.getByRole('list', { name: 'Order summary' });
    expect(summary).toHaveTextContent('Toyota Camry');
    expect(summary).toHaveTextContent('2 x');
    expect(screen.getByRole('button', { name: 'Pay $57,990' })).toBeInTheDocument();
    expect(screen.getByText(/demo payment/i)).toBeInTheDocument();
  });

  it('sends you back to the cart when there is nothing to pay for', async () => {
    renderApp(<App />, { route: '/payment', user: customerUser });
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });

  it('requires every card field', async () => {
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 1 }]);
    renderApp(<App />, { route: '/payment', user: customerUser });
    await userEvent.click(await screen.findByRole('button', { name: 'Pay $28,995' }));
    expect(await screen.findByText('Cardholder name is required')).toBeInTheDocument();
    expect(screen.getByText('Card number is required')).toBeInTheDocument();
    expect(screen.getByText('Expiry is required')).toBeInTheDocument();
    expect(screen.getByText('CVC is required')).toBeInTheDocument();
    expect(api.purchaseVehicle).not.toHaveBeenCalled();
  });

  it.each([
    ['a non-numeric card number', { number: 'abcd efgh' }, 'Enter a valid card number'],
    ['a badly formatted expiry', { expiry: '1299' }, 'Use the format MM/YY'],
    ['an expired card', { expiry: '01/20' }, 'This card has expired'],
    ['a short CVC', { cvc: '1' }, 'CVC must be 3 or 4 digits'],
  ])('rejects %s', async (_label, override, message) => {
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 1 }]);
    renderApp(<App />, { route: '/payment', user: customerUser });
    await screen.findByRole('heading', { name: 'Payment' });
    await fillCard(override);
    await userEvent.click(screen.getByRole('button', { name: 'Pay $28,995' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(api.purchaseVehicle).not.toHaveBeenCalled();
  });

  it('pays: buys each item through the purchase API (no card data sent), empties the cart and shows receipts', async () => {
    vi.mocked(api.purchaseVehicle).mockImplementation(async (id, qty) => (id === 'v-1' ? confirmation(camry, qty) : confirmation(rav4, qty)));
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 2 }, { vehicle: rav4, quantity: 1 }]);
    renderApp(<App />, { route: '/payment', user: customerUser });
    await screen.findByRole('heading', { name: 'Payment' });
    await fillCard();
    await userEvent.click(screen.getByRole('button', { name: 'Pay $91,440' }));

    expect(await screen.findByRole('heading', { name: 'Payment successful' })).toBeInTheDocument();
    expect(api.purchaseVehicle).toHaveBeenCalledTimes(2);
    expect(api.purchaseVehicle).toHaveBeenCalledWith('v-1', 2); // exactly (id, quantity): no card details
    expect(api.purchaseVehicle).toHaveBeenCalledWith('v-2', 1);
    expect(screen.getByText('Purchase confirmed: 2 x Toyota Camry')).toBeInTheDocument();
    expect(screen.getByText('Purchase confirmed: 1 x Toyota RAV4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cart' })).toBeInTheDocument(); // badge gone: cart emptied
    expect(JSON.parse(localStorage.getItem('autohub.cart.u-customer') ?? '[]')).toEqual([]);
  });

  it('after paying for the last units the inventory shows the car as sold out with 0', async () => {
    const lastTwo = makeVehicle({ quantity: 2 });
    vi.mocked(api.purchaseVehicle).mockResolvedValue(confirmation(lastTwo, 2));
    seedCart(customerUser.id, [{ vehicle: lastTwo, quantity: 2 }]);
    renderApp(<App />, { route: '/payment', user: customerUser });
    await screen.findByRole('heading', { name: 'Payment' });
    await fillCard();
    await userEvent.click(screen.getByRole('button', { name: 'Pay $57,990' }));
    await screen.findByRole('heading', { name: 'Payment successful' });

    vi.mocked(api.searchVehicles).mockResolvedValue(paged([{ ...lastTwo, quantity: 0 }]));
    await userEvent.click(screen.getByRole('link', { name: 'Continue shopping' }));
    const card = await screen.findByRole('article', { name: 'Toyota Camry' });
    expect(card).toHaveTextContent('Sold out');
    expect(within(card).getByLabelText('Quantity for Toyota Camry')).toHaveValue(0);
    expect(within(card).getByRole('button', { name: 'Purchase Toyota Camry' })).toBeDisabled();
  });

  it('handles an item that sold out meanwhile: keeps it in the cart, removes the ones that were bought, explains why', async () => {
    vi.mocked(api.purchaseVehicle).mockImplementation(async (id, qty) => {
      if (id === 'v-2') throw apiError(409, 'INSUFFICIENT_STOCK', 'Only 1 unit(s) available', { available: 1, requested: qty });
      return confirmation(camry, qty);
    });
    seedCart(customerUser.id, [{ vehicle: camry, quantity: 2 }, { vehicle: rav4, quantity: 3 }]);
    renderApp(<App />, { route: '/payment', user: customerUser });
    await screen.findByRole('heading', { name: 'Payment' });
    await fillCard();
    await userEvent.click(screen.getByRole('button', { name: /^Pay \$/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Toyota RAV4: Only 1 unit(s) available');
    expect(screen.getByText('Purchase confirmed: 2 x Toyota Camry')).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem('autohub.cart.u-customer') ?? '[]')).toEqual([expect.objectContaining({ quantity: 3, vehicle: expect.objectContaining({ id: 'v-2' }) })]));
    expect(screen.getByRole('link', { name: 'Back to cart' })).toHaveAttribute('href', '/cart');
  });
});
