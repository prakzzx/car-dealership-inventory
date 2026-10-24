import axios, { type AxiosError } from 'axios';

export const TOKEN_STORAGE_KEY = 'autohub.token';
export const UNAUTHORIZED_EVENT = 'autohub:unauthorized';

// SECURITY NOTE: the JWT lives in localStorage so it survives reloads. Any XSS bug could read it;
// see the "Security considerations" section of the README for the trade-offs versus httpOnly cookies.
export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};
export const setStoredToken = (token: string): void => localStorage.setItem(TOKEN_STORAGE_KEY, token);
export const clearStoredToken = (): void => localStorage.removeItem(TOKEN_STORAGE_KEY);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
  timeout: 15_000,
});

// Read the token at request time (not at module load) so login/logout take effect immediately.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const hadToken = Boolean(error.config?.headers?.get?.('Authorization'));
    // A 401 on an authenticated call means the token expired or was revoked: tell the app to log out.
    if (error.response?.status === 401 && hadToken) {
      clearStoredToken();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

function bodyOf(error: unknown): ApiErrorBody | undefined {
  if (axios.isAxiosError(error)) return error.response?.data as ApiErrorBody | undefined;
  return undefined;
}

export function getErrorCode(error: unknown): string | undefined {
  return bodyOf(error)?.error?.code;
}

/** Turns anything thrown by the API layer into a message that is safe and useful to show a person. */
export function getErrorMessage(error: unknown): string {
  const body = bodyOf(error)?.error;
  if (body?.message) {
    const details = Array.isArray(body.details) ? (body.details as { field?: string; message?: string }[]) : [];
    const extra = details
      .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
      .filter(Boolean)
      .join('; ');
    return extra ? `${body.message} (${extra})` : body.message;
  }
  if (axios.isAxiosError(error) && !error.response) return 'Cannot reach the server. Check that the API is running and try again.';
  return 'Something went wrong. Please try again.';
}
