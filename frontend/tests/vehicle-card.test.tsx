import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import VehicleCard from '../src/components/VehicleCard';
import { makeVehicle } from './fixtures';

function setup(props: Partial<Parameters<typeof VehicleCard>[0]> = {}) {
  const onPurchase = vi.fn();
  const onView = vi.fn();
  render(
    <MemoryRouter>
      <VehicleCard vehicle={makeVehicle()} isAdmin={false} onPurchase={onPurchase} onView={onView} {...props} />
    </MemoryRouter>,
  );
  return { onPurchase, onView };
}

describe('VehicleCard', () => {
  it('shows make, model, category, year, price and stock', () => {
    setup({ vehicle: makeVehicle({ price: 24999.99 }) });
    const card = screen.getByRole('article', { name: 'Toyota Camry' });
    expect(card).toHaveTextContent('Sedan');
    expect(card).toHaveTextContent('2024');
    expect(card).toHaveTextContent('$24,999.99');
    expect(card).toHaveTextContent('5 in stock');
  });

  it('DISABLES purchase (and quantity) when stock is 0 and says "Sold out"', () => {
    const { onPurchase } = setup({ vehicle: makeVehicle({ quantity: 0 }) });
    expect(screen.getByRole('button', { name: 'Purchase Toyota Camry' })).toBeDisabled();
    expect(screen.getByLabelText('Quantity for Toyota Camry')).toBeDisabled();
    expect(screen.getByText('Sold out')).toBeInTheDocument();
    expect(onPurchase).not.toHaveBeenCalled();
  });

  it('purchases the chosen quantity', async () => {
    const { onPurchase } = setup();
    const qty = screen.getByLabelText('Quantity for Toyota Camry');
    await userEvent.clear(qty);
    await userEvent.type(qty, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Purchase Toyota Camry' }));
    expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-1' }), 3);
  });

  it('refuses quantities above stock or below 1 and explains why', async () => {
    const { onPurchase } = setup({ vehicle: makeVehicle({ quantity: 2 }) });
    const qty = screen.getByLabelText('Quantity for Toyota Camry');
    await userEvent.clear(qty);
    await userEvent.type(qty, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Purchase Toyota Camry' }));
    expect(onPurchase).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose between 1 and 2');
  });

  it('hides admin controls from customers', () => {
    setup({ isAdmin: false });
    expect(screen.queryByRole('link', { name: 'Edit Toyota Camry' })).not.toBeInTheDocument();
  });

  it('shows admin controls to admins', () => {
    setup({ isAdmin: true });
    expect(screen.getByRole('link', { name: 'Edit Toyota Camry' })).toHaveAttribute('href', '/admin/vehicles/v-1/edit');
  });

  it('opens details', async () => {
    const { onView } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'View details for Toyota Camry' }));
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-1' }));
  });

  it('falls back to the local placeholder when the image fails to load', () => {
    setup({ vehicle: makeVehicle({ imageUrl: 'https://broken.example/car.jpg' }) });
    const img = screen.getByRole('img', { name: 'Toyota Camry' });
    expect(img).toHaveAttribute('src', 'https://broken.example/car.jpg');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/placeholder-car.svg');
  });
});
