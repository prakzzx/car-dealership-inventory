import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
      <p className="font-display text-6xl font-bold text-petrol-300">404</p>
      <h1 className="font-display text-2xl font-bold text-ink">Page not found</h1>
      <p className="max-w-md text-slate-600">The page you are looking for has moved or never existed.</p>
      <Link to="/" className="btn-primary">
        Back to inventory
      </Link>
    </main>
  );
}
