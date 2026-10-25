import { z } from 'zod';
import type { VehiclePayload } from '../types';

const required = (label: string) => z.string().trim().min(1, `${label} is required`);

export const loginFormSchema = z.object({
  email: required('Email').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Mirrors the server's password policy so people get feedback before a network round-trip.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lower-case letter')
  .regex(/[A-Z]/, 'Password must contain an upper-case letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const registerFormSchema = z
  .object({
    name: required('Name').max(100, 'Name must be at most 100 characters'),
    email: required('Email').email('Enter a valid email address'),
    password,
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

const maxYear = () => new Date().getFullYear() + 2;

// Every field is a string because that is what <input> gives us; conversion to numbers happens in toVehiclePayload.
export const vehicleFormSchema = z.object({
  make: required('Make').max(60),
  model: required('Model').max(60),
  category: required('Category').max(40),
  price: required('Price').superRefine((value, ctx) => {
    const n = Number(value);
    if (Number.isNaN(n)) ctx.addIssue({ code: 'custom', message: 'Price must be a number' });
    else if (n <= 0) ctx.addIssue({ code: 'custom', message: 'Price must be greater than 0' });
    else if (!/^\d+(\.\d{1,2})?$/.test(value)) ctx.addIssue({ code: 'custom', message: 'Price can have at most 2 decimal places' });
  }),
  quantity: required('Quantity').refine((v) => /^\d+$/.test(v), 'Quantity must be a whole number of 0 or more'),
  year: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d{4}$/.test(v) && Number(v) >= 1886 && Number(v) <= maxYear()), `Year must be between 1886 and ${maxYear()}`),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters'),
  imageUrl: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Image URL must start with http:// or https://'),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export function toVehiclePayload(values: VehicleFormValues): VehiclePayload {
  return {
    make: values.make.trim(),
    model: values.model.trim(),
    category: values.category.trim(),
    price: Number(values.price),
    quantity: Number(values.quantity),
    year: values.year.trim() ? Number(values.year) : null,
    description: values.description.trim() || null,
    imageUrl: values.imageUrl.trim() || null,
  };
}

export function vehicleToFormValues(vehicle?: { make: string; model: string; category: string; price: number; quantity: number; year: number | null; description: string | null; imageUrl: string | null }): VehicleFormValues {
  return {
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    category: vehicle?.category ?? '',
    price: vehicle ? String(vehicle.price) : '',
    quantity: vehicle ? String(vehicle.quantity) : '',
    year: vehicle?.year ? String(vehicle.year) : '',
    description: vehicle?.description ?? '',
    imageUrl: vehicle?.imageUrl ?? '',
  };
}

const luhnValid = (digits: string) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

/**
 * DEMO payment form. These values are validated in the browser only and are never sent to the API or stored:
 * the app has no payment provider, so "paying" just triggers the real stock-decreasing purchase calls.
 */
export const paymentFormSchema = z.object({
  cardName: required('Cardholder name').max(80),
  cardNumber: required('Card number').superRefine((value, ctx) => {
    const digits = value.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(digits) || !luhnValid(digits)) ctx.addIssue({ code: 'custom', message: 'Enter a valid card number' });
  }),
  expiry: required('Expiry').superRefine((value, ctx) => {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
    if (!match) {
      ctx.addIssue({ code: 'custom', message: 'Use the format MM/YY' });
      return;
    }
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) ctx.addIssue({ code: 'custom', message: 'This card has expired' });
  }),
  cvc: required('CVC').refine((v) => /^\d{3,4}$/.test(v), 'CVC must be 3 or 4 digits'),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
