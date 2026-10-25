import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import * as endpoints from '../src/api/endpoints';
import { TOKEN_STORAGE_KEY } from '../src/api/client';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { ToastProvider } from '../src/context/ToastContext';
import type { User } from '../src/types';

interface Options {
  route?: string;
  /** When provided, the app starts logged in as this user (token in localStorage + /auth/me mocked). */
  user?: User;
}

/** Renders `ui` inside the same providers as the real app. The API module must be mocked by the calling test file. */
export function renderApp(ui: ReactElement, { route = '/', user }: Options = {}) {
  if (user) {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'test-token');
    vi.mocked(endpoints.fetchMe).mockResolvedValue(user);
  }
  return render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>{ui}</CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
