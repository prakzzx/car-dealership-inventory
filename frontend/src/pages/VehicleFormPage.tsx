import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import * as api from '../api/endpoints';
import FormField from '../components/FormField';
import { ErrorState } from '../components/StateMessages';
import { useToast } from '../context/ToastContext';
import { toVehiclePayload, vehicleFormSchema, vehicleToFormValues, type VehicleFormValues } from '../lib/schemas';
import type { Vehicle } from '../types';

function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({ resolver: zodResolver(vehicleFormSchema), defaultValues: vehicleToFormValues(vehicle) });

  async function onSubmit(values: VehicleFormValues) {
    setServerError(null);
    try {
      const payload = toVehiclePayload(values);
      if (vehicle) await api.updateVehicle(vehicle.id, payload);
      else await api.createVehicle(payload);
      toast.success(vehicle ? 'Vehicle updated' : 'Vehicle added');
      navigate('/admin', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  const a11y = (field: keyof VehicleFormValues, id: string) => ({ id, 'aria-invalid': errors[field] ? true : undefined, 'aria-describedby': errors[field] ? `${id}-error` : undefined });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-5 sm:p-6">
      {serverError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {serverError}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="vf-make" label="Make" error={errors.make?.message}>
          <input type="text" className="input" {...a11y('make', 'vf-make')} {...register('make')} />
        </FormField>
        <FormField id="vf-model" label="Model" error={errors.model?.message}>
          <input type="text" className="input" {...a11y('model', 'vf-model')} {...register('model')} />
        </FormField>
        <FormField id="vf-category" label="Category" error={errors.category?.message} hint="e.g. Sedan, SUV, Truck, Electric">
          <input type="text" className="input" {...a11y('category', 'vf-category')} {...register('category')} />
        </FormField>
        <FormField id="vf-year" label="Year" error={errors.year?.message} hint="Optional">
          <input type="text" inputMode="numeric" className="input" {...a11y('year', 'vf-year')} {...register('year')} />
        </FormField>
        <FormField id="vf-price" label="Price (USD)" error={errors.price?.message}>
          <input type="text" inputMode="decimal" className="input" {...a11y('price', 'vf-price')} {...register('price')} />
        </FormField>
        <FormField id="vf-quantity" label="Quantity in stock" error={errors.quantity?.message}>
          <input type="text" inputMode="numeric" className="input" {...a11y('quantity', 'vf-quantity')} {...register('quantity')} />
        </FormField>
      </div>
      <FormField id="vf-image" label="Image URL" error={errors.imageUrl?.message} hint="Optional. A placeholder is used if empty or unreachable.">
        <input type="text" inputMode="url" className="input" {...a11y('imageUrl', 'vf-image')} {...register('imageUrl')} />
      </FormField>
      <FormField id="vf-description" label="Description" error={errors.description?.message} hint="Optional">
        <textarea rows={4} className="input" {...a11y('description', 'vf-description')} {...register('description')} />
      </FormField>
      <div className="flex justify-end gap-3">
        <Link to="/admin" className="btn-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save vehicle'}
        </button>
      </div>
    </form>
  );
}

export default function VehicleFormPage() {
  const { id } = useParams();
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; vehicle?: Vehicle; error?: string }>({ status: id ? 'loading' : 'ready' });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ status: 'loading' });
    api
      .getVehicle(id)
      .then((vehicle) => !cancelled && setState({ status: 'ready', vehicle }))
      .catch((e: unknown) => !cancelled && setState({ status: 'error', error: getErrorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink">{id ? 'Edit vehicle' : 'Add vehicle'}</h1>
      {state.status === 'loading' ? <p className="text-slate-600">Loading vehicle...</p> : null}
      {state.status === 'error' ? <ErrorState message={state.error ?? 'Could not load the vehicle.'} /> : null}
      {state.status === 'ready' ? <VehicleForm key={state.vehicle?.id ?? 'new'} vehicle={state.vehicle} /> : null}
    </div>
  );
}
