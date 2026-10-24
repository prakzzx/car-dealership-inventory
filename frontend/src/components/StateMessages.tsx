import { AlertTriangle, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
      <p className="text-red-900">{message}</p>
      {onRetry ? (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <SearchX className="h-8 w-8 text-petrol-400" aria-hidden="true" />
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {children ? <p className="max-w-md text-sm text-slate-600">{children}</p> : null}
      {action}
    </div>
  );
}
