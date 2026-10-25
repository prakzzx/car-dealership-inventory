import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import * as api from '../api/endpoints';
import FormField from '../components/FormField';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { paymentFormSchema, type PaymentFormValues } from '../lib/schemas';

export default function PaymentPage() {
  const cart = useCart();
  const [receipts, setReceipts] = useState<string[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({ resolver: zodResolver(paymentFormSchema), defaultValues: { cardName: '', cardNumber: '', expiry: '', cvc: '' } });

  const finished = receipts.length > 0 || failures.length > 0;
  if (cart.items.length === 0 && !finished) return <Navigate to="/cart" replace />;

  /**
   * "Paying" performs the real purchase call for each cart line, one after another. Each call is atomic on the
   * server, but the cart as a whole is not (a later line can fail after an earlier one succeeded). So lines are
   * removed from the cart one by one as they succeed, and failed lines stay so the person can adjust them.
   * Card details never leave this component: only (vehicleId, quantity) are sent.
   */
  async function onPay() {
    const lines = [...cart.items];
    const bought: string[] = [];
    const failed: string[] = [];
    for (const { vehicle, quantity } of lines) {
      try {
        const result = await api.purchaseVehicle(vehicle.id, quantity);
        bought.push(result.message);
        cart.removeItem(vehicle.id);
      } catch (error) {
        failed.push(`${vehicle.make} ${vehicle.model}: ${getErrorMessage(error)}`);
      }
    }
    setReceipts((r) => [...r, ...bought]);
    setFailures(failed);
  }

  const allDone = cart.items.length === 0 && failures.length === 0 && receipts.length > 0;
  const a11y = (field: keyof PaymentFormValues, id: string) => ({ id, 'aria-invalid': errors[field] ? true : undefined, 'aria-describedby': errors[field] ? `${id}-error` : undefined });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {allDone ? (
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-emerald-800">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            Payment successful
          </h1>
          <p className="text-slate-600">Thank you! Your stock has been updated.</p>
        </div>
      ) : (
        <h1 className="font-display text-3xl font-bold text-ink">Payment</h1>
      )}

      {receipts.length > 0 ? (
        <ul aria-label="Receipts" className="card divide-y divide-slate-100">
          {receipts.map((message, i) => (
            <li key={`${message}-${i}`} className="flex items-center gap-2 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {failures.length > 0 ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold">Some items could not be purchased:</p>
          <ul className="mt-1 list-disc pl-5">
            {failures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Link to="/cart" className="mt-2 inline-block font-medium underline">
            Back to cart
          </Link>
        </div>
      ) : null}

      {cart.items.length > 0 ? (
        <>
          <ul aria-label="Order summary" className="card divide-y divide-slate-100">
            {cart.items.map(({ vehicle, quantity }) => (
              <li key={vehicle.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span>{`${quantity} x ${vehicle.make} ${vehicle.model}`}</span>
                <span className="font-medium tabular-nums">{formatPrice(vehicle.price * quantity)}</span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleSubmit(onPay)} noValidate className="card space-y-4 p-5">
            <p className="flex items-start gap-2 rounded-lg bg-petrol-50 px-3 py-2 text-sm text-petrol-900">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>This is a demo payment: card details are checked in your browser only and are never sent or stored. Paying updates the real inventory.</span>
            </p>
            <FormField id="pay-name" label="Cardholder name" error={errors.cardName?.message}>
              <input type="text" autoComplete="cc-name" className="input" {...a11y('cardName', 'pay-name')} {...register('cardName')} />
            </FormField>
            <FormField id="pay-number" label="Card number" error={errors.cardNumber?.message} hint="Demo tip: 4242 4242 4242 4242">
              <input type="text" inputMode="numeric" autoComplete="cc-number" className="input" {...a11y('cardNumber', 'pay-number')} {...register('cardNumber')} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="pay-expiry" label="Expiry (MM/YY)" error={errors.expiry?.message}>
                <input type="text" inputMode="numeric" placeholder="12/30" autoComplete="cc-exp" className="input" {...a11y('expiry', 'pay-expiry')} {...register('expiry')} />
              </FormField>
              <FormField id="pay-cvc" label="CVC" error={errors.cvc?.message}>
                <input type="text" inputMode="numeric" autoComplete="cc-csc" className="input" {...a11y('cvc', 'pay-cvc')} {...register('cvc')} />
              </FormField>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : `Pay ${formatPrice(cart.total)}`}
            </button>
          </form>
        </>
      ) : (
        <Link to="/" className="btn-primary">
          Continue shopping
        </Link>
      )}
    </div>
  );
}
