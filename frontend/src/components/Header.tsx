import { CarFront, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-petrol-100 hover:bg-white/10 hover:text-white'}`;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="bg-petrol-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-md font-display text-xl font-bold tracking-tight">
          <CarFront className="h-6 w-6 text-signal-400" aria-hidden="true" />
          <span>AutoHub</span>
        </Link>

        <button type="button" className="rounded-md p-2 hover:bg-white/10 md:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>

        <div className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-14 z-40 flex-col gap-3 bg-petrol-900 px-4 pb-4 md:static md:flex md:flex-1 md:flex-row md:items-center md:justify-between md:bg-transparent md:p-0`}>
          <nav aria-label="Main" className="flex flex-col gap-1 md:ml-6 md:flex-row">
            <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
              Inventory
            </NavLink>
            {/* Convenience only: the /admin route guard and the API both enforce the ADMIN role independently. */}
            {isAdmin ? (
              <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
                Manage inventory
              </NavLink>
            ) : null}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-petrol-200">{isAdmin ? 'Administrator' : 'Customer'}</p>
            </div>
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-md border border-white/25 px-3 py-2 text-sm font-medium hover:bg-white/10">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
