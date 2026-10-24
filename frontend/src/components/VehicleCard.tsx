import { Eye, Pencil, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import type { Vehicle } from '../types';
import VehicleImage from './VehicleImage';

interface VehicleCardProps {
  vehicle: Vehicle;
  isAdmin: boolean;
  busy?: boolean;
  onPurchase: (vehicle: Vehicle, quantity: number) => void;
  onView: (vehicle: Vehicle) => void;
}

export default function VehicleCard({ vehicle, isAdmin, busy = false, onPurchase, onView }: VehicleCardProps) {
  const name = `${vehicle.make} ${vehicle.model}`;
  const soldOut = vehicle.quantity <= 0;
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState<string | null>(null);

  // Stock can change underneath us (purchase, concurrent buyer, reload): keep the selector valid.
  useEffect(() => {
    setError(null);
    setQuantity((q) => (Number(q) > vehicle.quantity ? '1' : q));
  }, [vehicle.quantity]);

  function handlePurchase() {
    const n = Number(quantity);
    if (!Number.isInteger(n) || n < 1 || n > vehicle.quantity) {
      setError(`Choose between 1 and ${vehicle.quantity}`);
      return;
    }
    setError(null);
    onPurchase(vehicle, n);
  }

  return (
    <article aria-label={name} className="card flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[16/10] bg-petrol-50">
        <VehicleImage src={vehicle.imageUrl} alt={name} className="h-full w-full object-cover" />
        {/* Window-sticker price tag: the one memorable element of the card. */}
        <p className="absolute bottom-0 left-0 rounded-tr-lg bg-signal-500 px-3 py-1.5 font-display text-lg font-bold tabular-nums text-white shadow">{formatPrice(vehicle.price)}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight text-ink">{name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="chip">{vehicle.category}</span>
            {vehicle.year ? <span>{vehicle.year}</span> : null}
          </p>
        </div>
        <p className={`text-sm font-medium ${soldOut ? 'text-red-700' : 'text-emerald-700'}`}>{soldOut ? 'Sold out' : `${vehicle.quantity} in stock`}</p>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(vehicle.quantity, 1)}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={soldOut || busy}
              aria-label={`Quantity for ${name}`}
              aria-invalid={error ? true : undefined}
              className="input w-20 text-center"
            />
            <button type="button" onClick={handlePurchase} disabled={soldOut || busy} aria-label={`Purchase ${name}`} className="btn-primary flex-1">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Purchase
            </button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onView(vehicle)} aria-label={`View details for ${name}`} className="btn-secondary flex-1">
              <Eye className="h-4 w-4" aria-hidden="true" />
              Details
            </button>
            {isAdmin ? (
              <Link to={`/admin/vehicles/${vehicle.id}/edit`} aria-label={`Edit ${name}`} className="btn-secondary">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
