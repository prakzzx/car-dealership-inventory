import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Vehicle } from '../types';
import { useAuth } from './AuthContext';

export interface CartItem {
  /** Snapshot of the vehicle when it was added/updated (its `quantity` is the stock we last saw). */
  vehicle: Vehicle;
  quantity: number;
}

interface CartApi {
  items: CartItem[];
  /** Total number of units across all lines (what the header badge shows). */
  itemCount: number;
  total: number;
  quantityInCart: (vehicleId: string) => number;
  /** Returns how many units were actually added (capped by the stock we know about; 0 = nothing added). */
  addItem: (vehicle: Vehicle, quantity: number) => number;
  setQuantity: (vehicleId: string, quantity: number) => void;
  removeItem: (vehicleId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartApi | null>(null);
const storageKey = (userId: string) => `autohub.cart.${userId}`;

function readCart(key: string): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    // Never trust storage blindly: drop anything that is not a well-formed line.
    return parsed.filter(
      (i): i is CartItem => typeof i === 'object' && i !== null && typeof (i as CartItem).quantity === 'number' && (i as CartItem).quantity > 0 && typeof (i as CartItem).vehicle?.id === 'string' && typeof (i as CartItem).vehicle?.price === 'number',
    );
  } catch {
    return [];
  }
}

const roundMoney = (n: number) => Math.round(n * 100) / 100;

/**
 * The cart is a client-side convenience: it reserves nothing on the server. Stock is only decreased (atomically,
 * by the API) when the person pays, so the payment step must handle "someone else bought it first".
 * Carts are stored per user so two people sharing a browser never see each other's items.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const key = user ? storageKey(user.id) : null;
  // The cart for the current user must be available on the very first render after login/reload: an effect-based
  // load left one render with an empty cart, which made /payment bounce back to /cart. So we re-derive it during
  // render whenever the user changes (React's documented "adjust state while rendering" pattern).
  const [store, setStore] = useState<{ key: string | null; items: CartItem[] }>(() => ({ key, items: key ? readCart(key) : [] }));
  const itemsRef = useRef<CartItem[]>(store.items);
  let items = store.items;
  if (store.key !== key) {
    items = key ? readCart(key) : [];
    itemsRef.current = items;
    setStore({ key, items });
  }

  const commit = useCallback(
    (next: CartItem[]) => {
      itemsRef.current = next;
      setStore({ key, items: next });
      if (key) localStorage.setItem(key, JSON.stringify(next));
    },
    [key],
  );

  const addItem = useCallback(
    (vehicle: Vehicle, quantity: number) => {
      const current = itemsRef.current;
      const existing = current.find((i) => i.vehicle.id === vehicle.id);
      const room = vehicle.quantity - (existing?.quantity ?? 0);
      const added = Math.max(0, Math.min(quantity, room));
      if (added === 0) return 0;
      const line: CartItem = { vehicle, quantity: (existing?.quantity ?? 0) + added };
      commit(existing ? current.map((i) => (i.vehicle.id === vehicle.id ? line : i)) : [...current, line]);
      return added;
    },
    [commit],
  );

  const setQuantity = useCallback(
    (vehicleId: string, quantity: number) => {
      commit(
        itemsRef.current.map((i) => (i.vehicle.id === vehicleId ? { ...i, quantity: Math.max(1, Math.min(Math.floor(quantity), Math.max(i.vehicle.quantity, 1))) } : i)),
      );
    },
    [commit],
  );

  const removeItem = useCallback((vehicleId: string) => commit(itemsRef.current.filter((i) => i.vehicle.id !== vehicleId)), [commit]);
  const clear = useCallback(() => commit([]), [commit]);

  const value = useMemo<CartApi>(
    () => ({
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      total: roundMoney(items.reduce((sum, i) => sum + i.vehicle.price * i.quantity, 0)),
      quantityInCart: (id) => items.find((i) => i.vehicle.id === id)?.quantity ?? 0,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, addItem, setQuantity, removeItem, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
