import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { loginFormSchema } from '../lib/schemas';
import AuthLayout from './AuthLayout';

interface LoginValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginFormSchema), defaultValues: { email: '', password: '' } });

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      await login(values.email.trim(), values.password);
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  return (
    <AuthLayout title="Sign in to AutoHub" subtitle="Welcome back. Enter your details to continue.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {serverError}
          </div>
        ) : null}
        <FormField id="login-email" label="Email" error={errors.email?.message}>
          <input id="login-email" type="email" autoComplete="email" className="input" aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? 'login-email-error' : undefined} {...register('email')} />
        </FormField>
        <FormField id="login-password" label="Password" error={errors.password?.message}>
          <input id="login-password" type="password" autoComplete="current-password" className="input" aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? 'login-password-error' : undefined} {...register('password')} />
        </FormField>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to AutoHub?{' '}
        <Link to="/register" className="font-medium text-petrol-700 underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
