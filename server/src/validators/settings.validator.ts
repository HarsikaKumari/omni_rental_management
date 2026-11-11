import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    ratePerUnitPaise: z
      .number({ invalid_type_error: 'Rate must be a number (paise)' })
      .int('Rate must be an integer paise amount')
      .min(1, 'Rate must be at least 1 paise per unit')
      .max(100_000, 'Rate cannot exceed 100000 paise (₹1000) per unit')
      .optional(),
    meterCapacity: z
      .number({ invalid_type_error: 'Meter capacity must be a number' })
      .int('Meter capacity must be an integer')
      .min(1000, 'Meter capacity must be at least 1000')
      .max(1_000_000, 'Meter capacity cannot exceed 1,000,000')
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Provide at least one field to update',
  });
  