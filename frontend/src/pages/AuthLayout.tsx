import { CarFront } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-petrol-900 p-12 text-white lg:flex">
        <p className="flex items-center gap-2 font-display text-2xl font-bold">
          <CarFront className="h-7 w-7 text-signal-400" aria-hidden="true" />
          AutoHub
        </p>
        <div>
          <p className="font-display text-4xl font-semibold leading-tight">Every car on the lot,
            <br />
            one honest count.</p>
          <p className="mt-4 max-w-md text-petrol-100">Browse live inventory, buy with confidence that stock is never oversold, and let your team restock in seconds.</p>
        </div>
        <p className="text-sm text-petrol-200">Dealership inventory system</p>
      </aside>
      <main className="flex items-center justify-center bg-paper px-4 py-10">
        <div className="card w-full max-w-md p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
