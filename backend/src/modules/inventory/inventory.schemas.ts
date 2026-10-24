import { z } from 'zod';

const wholeNumber = (max: number) => z.number({ invalid_type_error: 'Quantity must be a number' }).int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(max, `Quantity must be at most ${max}`);

// Defaults to 1 so "buy this car" needs no body; a body-less POST yields {} from express.json.
export const purchaseSchema = z.object({ quantity: wholeNumber(1000).default(1) });
export const restockSchema = z.object({ quantity: wholeNumber(100_000) });
