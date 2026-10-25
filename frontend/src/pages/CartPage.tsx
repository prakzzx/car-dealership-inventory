import { CreditCard, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import VehicleImage from '../components/VehicleImage';
import { EmptyState } from '../components/StateMessages';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';

export default function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <EmptyState
          title="Your cart is empty"
          action={
            <Link to="/" className="btn-primary">
              Browse inventory
            </Link>
          }
        >
          Add a vehicle with the Purchase button and it will show up here.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Your cart</h1>
        <p className="text-slate-600">Check your vehicles, then pay the bill. Stock is confirmed when you pay.</p>
      </div>

      <ul aria-label="Cart items" className="space-y-4">
        {cart.items.map(({ vehicle, quantity }) => {
          const name = `${vehicle.make} ${vehicle.model}`;
          return (
            <li key={vehicle.id}>
              <article aria-label={name} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <VehicleImage src={vehicle.imageUrl} alt="" className="h-28 w-full rounded-lg object-cover sm:w-44" />
                <div className="flex-1 space-y-1">
                  <h2 className="font-display text-lg font-semibold text-ink">{name}</h2>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="chip">{vehicle.category}</span>
                    {vehicle.year ? <span>{vehicle.year}</span> : null}
                  </p>
                  <p className="text-sm text-slate-600">
                    Unit price <span className="font-medium tabular-nums text-ink">{formatPrice(vehicle.price)}</span>
                  </p>
                  <p className="text-xs text-slate-500">{`${vehicle.quantity} in stock when added`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-icon border border-slate-300" aria-label={`Decrease quantity of ${name}`} disabled={quantity <= 1} onClick={() => cart.setQuantity(vehicle.id, quantity - 1)}>
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={vehicle.quantity}
                    value={quantity}
                    aria-label={`Cart quantity for ${name}`}
                    onChange={(e) => Number.isFinite(e.target.valueAsNumber) && cart.setQuantity(vehicle.id, e.target.valueAsNumber)}
                    className="input w-16 text-center"
                  />
                  <button type="button" className="btn-icon border border-slate-300" aria-label={`Increase quantity of ${name}`} disabled={quantity >= vehicle.quantity} onClick={() => cart.setQuantity(vehicle.id, quantity + 1)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="min-w-28 text-right font-display text-lg font-bold tabular-nums text-signal-700">{formatPrice(vehicle.price * quantity)}</p>
                <button type="button" className="btn-icon text-red-700 hover:bg-red-50" aria-label={`Remove ${name} from cart`} onClick={() => cart.removeItem(vehicle.id)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            </li>
          );
        })}
      </ul>

      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Order total">
          <p className="text-sm text-slate-600">{`Total for ${cart.itemCount} ${cart.itemCount === 1 ? 'vehicle' : 'vehicles'}`}</p>
          <p className="font-display text-3xl font-bold tabular-nums text-petrol-800">
            <span>{formatPrice(cart.total)}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/" className="btn-secondary">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Continue shopping
          </Link>
          <button type="button" className="btn-primary" onClick={() => navigate('/payment')}>
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            Pay bill
          </button>
        </div>
      </div>
    </div>
  );
}
