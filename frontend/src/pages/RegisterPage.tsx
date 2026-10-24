import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { registerFormSchema } from '../lib/schemas';
import AuthLayout from './AuthLayout';

interface RegisterValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export default function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerFormSchema), defaultValues: { name: '', email: '', password: '', confirm: '' } });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    try {
      // The confirmation field is a UI-only guard; it is never sent to the server.
      await signUp(values.name.trim(), values.email.trim(), values.password);
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  const aria = (field: keyof RegisterValues, id: string) => ({ 'aria-invalid': errors[field] ? true : undefined, 'aria-describedby': errors[field] ? `${id}-error` : undefined });

  return (
    <AuthLayout title="Create your account" subtitle="Customer accounts can browse and purchase vehicles.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {serverError}
          </div>
        ) : null}
        <FormField id="reg-name" label="Name" error={errors.name?.message}>
          <input id="reg-name" type="text" autoComplete="name" className="input" {...aria('name', 'reg-name')} {...register('name')} />
        </FormField>
        <FormField id="reg-email" label="Email" error={errors.email?.message}>
          <input id="reg-email" type="email" autoComplete="email" className="input" {...aria('email', 'reg-email')} {...register('email')} />
        </FormField>
        <FormField id="reg-password" label="Password" error={errors.password?.message} hint="At least 8 characters with upper-case, lower-case and a digit.">
          <input id="reg-password" type="password" autoComplete="new-password" className="input" {...aria('password', 'reg-password')} {...register('password')} />
        </FormField>
        <FormField id="reg-confirm" label="Confirm password" error={errors.confirm?.message}>
          <input id="reg-confirm" type="password" autoComplete="new-password" className="input" {...aria('confirm', 'reg-confirm')} {...register('confirm')} />
        </FormField>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-petrol-700 underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
