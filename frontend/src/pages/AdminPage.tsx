import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import * as api from '../api/endpoints';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { ErrorState } from '../components/StateMessages';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../lib/format';
import type { PageMeta, Vehicle } from '../types';

const ADMIN_PAGE_SIZE = 20;

function RestockDialog({ vehicle, onClose, onDone }: { vehicle: Vehicle; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = `${vehicle.make} ${vehicle.model}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const n = Number(value);
    if (!/^\d+$/.test(value.trim()) || n < 1) {
      setError('Enter a whole number of at least 1');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.restockVehicle(vehicle.id, n);
      toast.success(`Added ${n} unit(s) to ${name}`);
      onDone();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Restock ${name}`} onClose={onClose} widthClass="max-w-sm">
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-slate-600">{`Currently ${vehicle.quantity} in stock.`}</p>
        <div>
          <label htmlFor="restock-qty" className="label">
            Units to add
          </label>
          <input id="restock-qty" type="text" inputMode="numeric" className="input" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={error ? true : undefined} />
          {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            Add stock
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; items: Vehicle[]; meta: PageMeta | null; error: string | null }>({ status: 'loading', items: [], meta: null, error: null });
  const [toDelete, setToDelete] = useState<Vehicle | null>(null);
  const [toRestock, setToRestock] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    api
      .listVehicles({ page, limit: ADMIN_PAGE_SIZE, sortBy: 'make', sortOrder: 'asc', availability: 'all' })
      .then((r) => !cancelled && setState({ status: 'ready', items: r.items, meta: r.meta, error: null }))
      .catch((e: unknown) => !cancelled && setState((s) => ({ ...s, status: 'error', error: getErrorMessage(e) })));
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteVehicle(toDelete.id);
      toast.success('Vehicle deleted');
      setToDelete(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Manage inventory</h1>
          <p className="text-slate-600">Add, edit, restock and remove vehicles. Sold-out vehicles are included here.</p>
        </div>
        <Link to="/admin/vehicles/new" className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add vehicle
        </Link>
      </div>

      {state.status === 'error' ? (
        <ErrorState message={state.error ?? 'Could not load vehicles.'} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <div className="card overflow-x-auto" aria-busy={state.status === 'loading'}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">All vehicles</caption>
            <thead className="bg-petrol-50 text-slate-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Vehicle</th>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Price</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Stock</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.status === 'loading' && state.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading vehicles...
                  </td>
                </tr>
              ) : null}
              {state.status === 'ready' && state.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No vehicles yet. Add the first one.
                  </td>
                </tr>
              ) : null}
              {state.items.map((v) => {
                const name = `${v.make} ${v.model}`;
                return (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-medium text-ink">{name}{v.year ? ` (${v.year})` : ''}</td>
                    <td className="px-4 py-3">{v.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPrice(v.price)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${v.quantity === 0 ? 'font-semibold text-red-700' : ''}`}>{v.quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/vehicles/${v.id}/edit`} aria-label={`Edit ${name}`} className="btn-icon">
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <button type="button" aria-label={`Restock ${name}`} className="btn-icon" onClick={() => setToRestock(v)}>
                          <Package className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`Delete ${name}`} className="btn-icon text-red-700 hover:bg-red-50" onClick={() => setToDelete(v)}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {state.meta ? <Pagination page={state.meta.page} totalPages={state.meta.totalPages} onChange={setPage} /> : null}

      {toDelete ? (
        <ConfirmDialog title="Delete vehicle?" confirmLabel="Delete" busy={deleting} onConfirm={confirmDelete} onCancel={() => setToDelete(null)}>
          <p>
            {`Delete ${toDelete.make} ${toDelete.model}? This cannot be undone. Past purchase records are kept.`}
          </p>
        </ConfirmDialog>
      ) : null}
      {toRestock ? (
        <RestockDialog
          vehicle={toRestock}
          onClose={() => setToRestock(null)}
          onDone={() => {
            setToRestock(null);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}
    </div>
  );
}
