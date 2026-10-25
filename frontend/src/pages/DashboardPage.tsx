import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client';
import * as api from '../api/endpoints';
import Pagination from '../components/Pagination';
import SearchFilters from '../components/SearchFilters';
import StatsCards from '../components/StatsCards';
import { EmptyState, ErrorState } from '../components/StateMessages';
import VehicleCard from '../components/VehicleCard';
import VehicleCardSkeleton from '../components/VehicleCardSkeleton';
import VehicleDetailsModal from '../components/VehicleDetailsModal';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { DEFAULT_FILTERS, PAGE_SIZE, buildSearchParams, type FilterState } from '../lib/filters';
import type { PageMeta, Vehicle, VehicleStats } from '../types';

type ListState = { status: 'loading' | 'ready' | 'error'; items: Vehicle[]; meta: PageMeta | null; error: string | null };

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const cart = useCart();

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<ListState>({ status: 'loading', items: [], meta: null, error: null });
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [selected, setSelected] = useState<Vehicle | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .fetchStats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => undefined); // The summary is a nicety; the list below reports real errors.
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setList((s) => ({ ...s, status: 'loading', error: null }));
    api
      .searchVehicles(buildSearchParams(filters, page))
      .then((result) => !cancelled && setList({ status: 'ready', items: result.items, meta: result.meta, error: null }))
      .catch((error: unknown) => !cancelled && setList((s) => ({ ...s, status: 'error', error: getErrorMessage(error) })));
    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey]);

  const applyFilters = useCallback((next: FilterState) => {
    setFilters(next);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    setPage(1);
    setReloadKey((k) => k + 1);
  }, []);

  // "Purchase" puts the vehicle in the cart. Stock only changes when the person pays (see PaymentPage).
  function handlePurchase(vehicle: Vehicle, quantity: number) {
    const added = cart.addItem(vehicle, quantity);
    if (added === 0) toast.error(`No more units of ${vehicle.make} ${vehicle.model} are available to add.`);
    else toast.success(`Added ${added} x ${vehicle.make} ${vehicle.model} to your cart`);
  }

  const categories = stats?.categories.map((c) => c.category) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Inventory</h1>
        <p className="text-slate-600">Browse what is on the lot right now.</p>
      </div>

      <StatsCards stats={stats} />
      <SearchFilters filters={filters} categories={categories} onApply={applyFilters} onReset={resetFilters} />

      {list.status === 'error' ? (
        <ErrorState message={list.error ?? 'Could not load vehicles.'} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : list.status === 'ready' && list.items.length === 0 ? (
        <EmptyState
          title="No vehicles found"
          action={
            <button type="button" className="btn-secondary" onClick={resetFilters}>
              Clear filters
            </button>
          }
        >
          Nothing matches those filters. Try widening the price range or clearing the search.
        </EmptyState>
      ) : (
        <ul aria-label="Vehicles" aria-busy={list.status === 'loading'} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.status === 'loading'
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <VehicleCardSkeleton />
                </li>
              ))
            : list.items.map((vehicle) => (
                <li key={vehicle.id}>
                  <VehicleCard vehicle={vehicle} isAdmin={isAdmin} inCart={cart.quantityInCart(vehicle.id)} onPurchase={handlePurchase} onView={setSelected} />
                </li>
              ))}
        </ul>
      )}

      {list.meta && list.status === 'ready' ? <Pagination page={list.meta.page} totalPages={list.meta.totalPages} onChange={setPage} /> : null}
      {list.meta && list.status === 'ready' && list.items.length > 0 ? (
        <p className="text-center text-xs text-slate-500">{`Showing ${list.items.length} of ${list.meta.total} vehicles (up to ${PAGE_SIZE} per page)`}</p>
      ) : null}

      {selected ? <VehicleDetailsModal vehicle={selected} isAdmin={isAdmin} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
