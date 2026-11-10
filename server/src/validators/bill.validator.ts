import { z } from 'zod';

export const billIdParamSchema = z.object({ id: z.string().min(1) });

const readingSchema = z.coerce.number().min(0).max(99_999_999);

export const previewBillSchema = z.object({
    occupancyId: z.string().min(1),
    currentReading: readingSchema,
    type: z.enum(['RENT_AND_ELECTRICITY', 'ELECTRICITY_ONLY']),
});

export const generateBillSchema = z.object({
    occupancyId: z.string().min(1),
    type: z.enum(['RENT_AND_ELECTRICITY', 'ELECTRICITY_ONLY']),
    billingMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format: YYYY-MM'),
    currentReading: readingSchema,
    confirmedRollover: z.coerce.boolean().optional(),
});

export const listBillsQuerySchema = z.object({
    status: z
        .string()
        .optional()
        .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
    occupancyId: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const paidTillSchema = z.object({
    paidTillReading: readingSchema,
});
