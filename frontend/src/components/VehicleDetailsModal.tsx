import { Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import type { Vehicle } from '../types';
import Modal from './Modal';
import VehicleImage from './VehicleImage';

interface Props {
  vehicle: Vehicle;
  isAdmin: boolean;
  onClose: () => void;
}

export default function VehicleDetailsModal({ vehicle, isAdmin, onClose }: Props) {
  const name = `${vehicle.make} ${vehicle.model}`;
  return (
    <Modal title={name} onClose={onClose} widthClass="max-w-2xl">
      <div className="space-y-4">
        <VehicleImage src={vehicle.imageUrl} alt={name} className="aspect-[16/9] w-full rounded-lg object-cover" />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Price</dt>
            <dd className="font-display text-lg font-bold tabular-nums text-signal-700">{formatPrice(vehicle.price)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Category</dt>
            <dd className="font-medium">{vehicle.category}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Year</dt>
            <dd className="font-medium">{vehicle.year ?? 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Availability</dt>
            <dd className={`font-medium ${vehicle.quantity > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{vehicle.quantity > 0 ? `${vehicle.quantity} in stock` : 'Sold out'}</dd>
          </div>
        </dl>
        <p className="text-sm leading-relaxed text-slate-700">{vehicle.description ?? 'No description provided.'}</p>
        <div className="flex justify-end gap-3">
          {isAdmin ? (
            <Link to={`/admin/vehicles/${vehicle.id}/edit`} className="btn-secondary">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit vehicle
            </Link>
          ) : null}
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
