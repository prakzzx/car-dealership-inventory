import type { VehicleStats } from '../types';

export default function StatsCards({ stats }: { stats: VehicleStats | null }) {
  if (!stats) {
    return (
      <div className="grid animate-pulse grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }
  const items = [
    { label: 'Total vehicles', value: stats.totalVehicles },
    { label: 'Vehicles in stock', value: stats.inStockVehicles },
    { label: 'Units in stock', value: stats.totalStock },
    { label: 'Categories', value: stats.categories.length },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} role="group" aria-label={item.label} className="card border-l-4 border-l-petrol-600 px-4 py-3">
          <p className="font-display text-3xl font-bold tabular-nums text-petrol-800">{item.value}</p>
          <p className="text-sm text-slate-600">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
