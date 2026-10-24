export default function VehicleCardSkeleton() {
  return (
    <div data-testid="vehicle-skeleton" className="card animate-pulse overflow-hidden" aria-hidden="true">
      <div className="aspect-[16/10] bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 rounded bg-slate-200" />
        <div className="h-4 w-1/3 rounded bg-slate-200" />
        <div className="h-4 w-1/4 rounded bg-slate-200" />
        <div className="h-10 rounded bg-slate-200" />
      </div>
    </div>
  );
}
