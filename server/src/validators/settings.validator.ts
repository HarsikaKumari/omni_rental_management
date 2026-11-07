import { z } from 'zod';

export const updateSettingsSchema = z.object({
  ratePerUnitPaise: z
    .number({ invalid_type_error: 'Rate must be a number (paise)' })
    .int('Rate must be an integer paise amount')
    .min(1, 'Rate must be at least 1 paise per unit')
    .max(100_000, 'Rate cannot exceed 100000 paise (₹1000) per unit'),
});
