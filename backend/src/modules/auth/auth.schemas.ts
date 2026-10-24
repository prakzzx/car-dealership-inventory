import { z } from 'zod';

/**
 * Password policy: 8-72 chars (72 bytes is bcrypt's hard limit), at least one lower-case letter,
 * one upper-case letter and one digit.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lower-case letter')
  .regex(/[A-Z]/, 'Password must contain an upper-case letter')
  .regex(/[0-9]/, 'Password must contain a digit');

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

// NOTE: zod objects strip unknown keys, so a client-supplied "role" is silently discarded here.
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
