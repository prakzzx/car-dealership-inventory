import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../src/api/endpoints';
import LoginPage from '../src/pages/LoginPage';
import RegisterPage from '../src/pages/RegisterPage';
import { apiError, customerUser } from './fixtures';
import { renderApp } from './utils';

vi.mock('../src/api/endpoints');

const pages = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/" element={<h1>Home page</h1>} />
  </Routes>
);

beforeEach(() => vi.clearAllMocks());

describe('LoginPage', () => {
  it('shows required-field messages when submitted empty and does not call the API', async () => {
    renderApp(pages, { route: '/login' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    renderApp(pages, { route: '/login' });
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever1A');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('logs in, stores the token and navigates home', async () => {
    vi.mocked(api.login).mockResolvedValue({ user: customerUser, token: 'jwt-123' });
    renderApp(pages, { route: '/login' });
    await userEvent.type(screen.getByLabelText('Email'), 'casey@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ngPassw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith('casey@example.com', 'Str0ngPassw0rd');
    expect(localStorage.getItem('autohub.token')).toBe('jwt-123');
  });

  it('shows the server message for bad credentials', async () => {
    vi.mocked(api.login).mockRejectedValue(apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    renderApp(pages, { route: '/login' });
    await userEvent.type(screen.getByLabelText('Email'), 'casey@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'WrongPassw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('RegisterPage', () => {
  async function fill(opts: { name?: string; email?: string; password?: string; confirm?: string } = {}) {
    const name = opts.name ?? 'Casey';
    const email = opts.email ?? 'casey@example.com';
    const password = opts.password ?? 'Str0ngPassw0rd';
    const confirm = opts.confirm ?? password;
    if (name) await userEvent.type(screen.getByLabelText('Name'), name);
    if (email) await userEvent.type(screen.getByLabelText('Email'), email);
    if (password) await userEvent.type(screen.getByLabelText('Password'), password);
    if (confirm) await userEvent.type(screen.getByLabelText('Confirm password'), confirm);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  }

  it('requires every field', async () => {
    renderApp(pages, { route: '/register' });
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it.each([
    ['short', 'Ab1', 'Password must be at least 8 characters'],
    ['no uppercase', 'lowercase123', 'Password must contain an upper-case letter'],
    ['no digit', 'NoDigitsHere', 'Password must contain a digit'],
  ])('rejects a weak password (%s) with a helpful message', async (_label, password, message) => {
    renderApp(pages, { route: '/register' });
    await fill({ password });
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it('requires the confirmation to match', async () => {
    renderApp(pages, { route: '/register' });
    await fill({ confirm: 'Different1Password' });
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('registers (without sending the confirmation) and logs the user in', async () => {
    vi.mocked(api.register).mockResolvedValue({ user: customerUser, token: 'jwt-new' });
    renderApp(pages, { route: '/register' });
    await fill();
    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument();
    expect(api.register).toHaveBeenCalledWith('Casey', 'casey@example.com', 'Str0ngPassw0rd');
    expect(localStorage.getItem('autohub.token')).toBe('jwt-new');
  });

  it('shows the duplicate-email error from the server', async () => {
    vi.mocked(api.register).mockRejectedValue(apiError(409, 'CONFLICT', 'An account with this email already exists'));
    renderApp(pages, { route: '/register' });
    await fill();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('An account with this email already exists'));
  });
});
